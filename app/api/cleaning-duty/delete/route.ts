import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

type CleaningDutyDeleteAuthResult =
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

async function resolveCleaningDutyDeleteAuthContext(): Promise<CleaningDutyDeleteAuthResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('cleaningDuty.error', {
      operation: 'deleteRow',
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
      operation: 'deleteRow',
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
      operation: 'deleteRow',
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
    const auth = await resolveCleaningDutyDeleteAuthContext();

    if ('error' in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, userId, groupCode, isGroupLeader } = auth.context;

    if (!groupCode) {
      logError('cleaningDuty.error', {
        tenantId,
        userId,
        groupCode: null,
        operation: 'deleteRow',
        errorCode: 'no_group',
      });
      return NextResponse.json({ errorCode: 'no_group' }, { status: 403 });
    }

    if (!isGroupLeader) {
      logError('cleaningDuty.error', {
        tenantId,
        userId,
        groupCode,
        operation: 'deleteRow',
        errorCode: 'forbidden',
      });
      return NextResponse.json({ errorCode: 'forbidden' }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as { id?: string } | null;
    const id = typeof body?.id === 'string' ? body.id.trim() : '';

    if (!id) {
      return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
    }

    const duty = (await prisma.cleaning_duties.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        group_code: groupCode,
      },
      select: {
        id: true,
        residence_code: true,
        cycle_no: true,
        completed_at: true,
        assignee_id: true,
      },
    } as any)) as {
      id: string;
      residence_code: string;
      cycle_no: number;
      completed_at: Date | string | null;
      assignee_id: string;
    } | null;

    if (!duty) {
      return NextResponse.json({ errorCode: 'not_found' }, { status: 404 });
    }

    if (duty.completed_at) {
      return NextResponse.json({ errorCode: 'cannot_delete_completed' }, { status: 400 });
    }

    await prisma.cleaning_duties.delete({
      where: {
        id: duty.id,
      },
    } as any);

    logInfo('cleaningDuty.row.delete', {
      tenantId,
      userId,
      groupCode,
      residenceCode: duty.residence_code,
      cycleNo: duty.cycle_no,
      assigneeId: duty.assignee_id,
    });

    return NextResponse.json({ ok: true as const }, { status: 200 });
  } catch (error) {
    logError('cleaningDuty.error', {
      operation: 'deleteRow',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
