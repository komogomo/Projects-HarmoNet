import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

type CleaningDutyAuthResult =
  | {
      error: {
        status: number;
        body: { errorCode: string };
      };
    }
  | {
      context: {
        tenantId: string;
        userId: string;
        groupCode: string;
        isGroupLeader: boolean;
      };
    };

async function resolveCleaningDutyAuthContext(): Promise<CleaningDutyAuthResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('cleaningDuty.error', {
      operation: 'completeCycle',
      errorCode: 'auth_error',
      reason: authError?.message ?? 'no_session',
    });
    return { error: { status: 401, body: { errorCode: 'auth_error' } } };
  }

  const email = user.email;

  const {
    data: appUser,
    error: appUserError,
  } = await supabase
    .from('users')
    .select('id, tenant_id, group_code')
    .eq('email', email)
    .maybeSingle();

  if (appUserError || !appUser) {
    logError('cleaningDuty.error', {
      operation: 'completeCycle',
      errorCode: 'unauthorized',
      reason: 'user_not_found',
      email,
    });
    return { error: { status: 403, body: { errorCode: 'unauthorized' } } };
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', appUser.id)
    .maybeSingle();

  if (membershipError || !membership?.tenant_id) {
    logError('cleaningDuty.error', {
      operation: 'completeCycle',
      errorCode: 'unauthorized',
      userId: appUser.id,
    });
    return { error: { status: 403, body: { errorCode: 'unauthorized' } } };
  }

  const tenantId = membership.tenant_id as string;
  const groupCodeRaw = (appUser as any).group_code as string | null | undefined;
  const groupCode = typeof groupCodeRaw === 'string' ? groupCodeRaw : '';

  let isGroupLeader = false;

  try {
    const {
      data: userRoles,
      error: userRolesError,
    } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', appUser.id)
      .eq('tenant_id', tenantId);

    if (!userRolesError && userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
      const roleIds = userRoles
        .map((row: any) => row.role_id)
        .filter((id: unknown): id is string => typeof id === 'string');

      if (roleIds.length > 0) {
        const {
          data: roles,
          error: rolesError,
        } = await supabase
          .from('roles')
          .select('id, role_key')
          .in('id', roleIds as string[]);

        if (!rolesError && roles && Array.isArray(roles)) {
          isGroupLeader = roles.some((role: any) => role.role_key === 'group_leader');
        }
      }
    }
  } catch {
    isGroupLeader = false;
  }

  return {
    context: {
      tenantId,
      userId: appUser.id as string,
      groupCode,
      isGroupLeader,
    },
  };
}

export async function POST(req: Request) {
  try {
    const auth = await resolveCleaningDutyAuthContext();

    if ('error' in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, userId, groupCode, isGroupLeader } = auth.context;

    if (!groupCode) {
      logError('cleaningDuty.error', {
        tenantId,
        userId,
        groupCode: null,
        operation: 'completeCycle',
        errorCode: 'no_group',
      });
      return NextResponse.json({ errorCode: 'no_group' }, { status: 403 });
    }

    if (!isGroupLeader) {
      logError('cleaningDuty.error', {
        tenantId,
        userId,
        groupCode,
        operation: 'completeCycle',
        errorCode: 'forbidden',
      });
      return NextResponse.json({ errorCode: 'forbidden' }, { status: 403 });
    }

    const latestCycleRow = (await prisma.cleaning_duties.findFirst({
      where: {
        tenant_id: tenantId,
        group_code: groupCode,
      },
      select: {
        cycle_no: true,
      },
      orderBy: {
        cycle_no: 'desc',
      },
    } as any)) as { cycle_no: number } | null;

    if (!latestCycleRow || typeof latestCycleRow.cycle_no !== 'number') {
      return NextResponse.json({ ok: false as const, errorCode: 'no_cycle' as const }, { status: 400 });
    }

    const currentCycleNo = latestCycleRow.cycle_no;
    const completedAt = new Date();

    await prisma.$transaction(async (tx) => {
      const currentRows = (await tx.cleaning_duties.findMany({
        where: {
          tenant_id: tenantId,
          group_code: groupCode,
          cycle_no: currentCycleNo,
        },
        select: {
          residence_code: true,
          assignee_id: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      } as any)) as { residence_code: string; assignee_id: string; created_at: Date }[];

      if (!currentRows || currentRows.length === 0) {
        throw new Error('no_current_rows');
      }

      await tx.cleaning_duties.updateMany({
        where: {
          tenant_id: tenantId,
          group_code: groupCode,
          cycle_no: currentCycleNo,
          completed_at: null,
        },
        data: {
          completed_at: completedAt,
        },
      } as any);

      const nextCycleNo = currentCycleNo + 1;

      // 表示順（班長が決めた順）を次サイクルにも引き継ぎたいので、
      // currentRows の並び順に従って created_at を少しずつずらしながら設定する
      const createdAtBase = new Date();

      const insertData = currentRows.map((row, index) => ({
        tenant_id: tenantId,
        group_code: groupCode,
        residence_code: row.residence_code,
        cycle_no: nextCycleNo,
        assignee_id: row.assignee_id,
        is_done: false,
        cleaned_on: null,
        completed_at: null,
        created_at: new Date(createdAtBase.getTime() + index),
        updated_at: new Date(createdAtBase.getTime() + index),
      }));

      if (insertData.length > 0) {
        await tx.cleaning_duties.createMany({
          data: insertData,
        } as any);
      }
    });

    logInfo('cleaningDuty.cycle.complete', {
      tenantId,
      userId,
      groupCode,
      cycleNo: currentCycleNo,
      completedAt: completedAt.toISOString(),
    });

    return NextResponse.json({ ok: true as const }, { status: 200 });
  } catch (error) {
    // Best-effort body parse for logging context
    let tenantIdFromBody: string | undefined;
    let groupCodeFromBody: string | undefined;
    try {
      const body = (await req.json().catch(() => ({}))) as {
        tenantId?: string;
        groupCode?: string;
      };
      if (typeof body.tenantId === 'string') {
        tenantIdFromBody = body.tenantId;
      }
      if (typeof body.groupCode === 'string') {
        groupCodeFromBody = body.groupCode;
      }
    } catch {
      // ignore
    }

    logError('cleaningDuty.error', {
      operation: 'completeCycle',
      tenantId: tenantIdFromBody,
      groupCode: groupCodeFromBody,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { ok: false as const, errorCode: 'server_error' as const },
      { status: 500 },
    );
  }
}
