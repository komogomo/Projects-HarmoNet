import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logError } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

interface CleaningDutyRowDto {
  id: string;
  residenceCode: string;
  cycleNo: number;
  assigneeId: string;
  isDone: boolean;
  cleanedOn: string | null;
  completedAt: string | null;
}

type CleaningDutyCurrentAuthResult =
  | {
      error: {
        status: number;
        body: { errorCode: string };
      };
    }
  | {
      context: {
        tenantId: string;
        groupCode: string;
      };
    };

async function resolveCleaningDutyCurrentAuthContext(): Promise<CleaningDutyCurrentAuthResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('cleaningDuty.error', {
      operation: 'fetchCurrent',
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
      operation: 'fetchCurrent',
      errorCode: 'unauthorized',
      reason: 'user_not_found',
      email,
    });
    return { error: { status: 403, body: { errorCode: 'unauthorized' } } };
  }

  const tenantIdRaw = (appUser as any).tenant_id as string | null | undefined;
  const groupCodeRaw = (appUser as any).group_code as string | null | undefined;

  if (!tenantIdRaw || !groupCodeRaw) {
    logError('cleaningDuty.error', {
      operation: 'fetchCurrent',
      errorCode: 'no_group',
      userId: appUser.id,
    });
    return { error: { status: 403, body: { errorCode: 'no_group' } } };
  }

  return {
    context: {
      tenantId: tenantIdRaw,
      groupCode: groupCodeRaw,
    },
  };
}

export async function GET() {
  try {
    const auth = await resolveCleaningDutyCurrentAuthContext();

    if ('error' in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, groupCode } = auth.context;

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
      // まだ清掃当番データがない場合
      return NextResponse.json({ ok: true as const, rows: [] as CleaningDutyRowDto[] }, { status: 200 });
    }

    const latestCycleNo = latestCycleRow.cycle_no;

    const rows = (await prisma.cleaning_duties.findMany({
      where: {
        tenant_id: tenantId,
        group_code: groupCode,
        cycle_no: latestCycleNo,
        // 現在の当番表として扱うため、同一テナント・同一グループに所属しているユーザのみ対象とする
        assignee: {
          tenant_id: tenantId,
          group_code: groupCode,
        },
      },
      select: {
        id: true,
        cycle_no: true,
        assignee_id: true,
        is_done: true,
        cleaned_on: true,
        completed_at: true,
        created_at: true,
        assignee: {
          select: {
            residence_code: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    } as any)) as unknown as {
      id: string;
      cycle_no: number;
      assignee_id: string;
      is_done: boolean;
      cleaned_on: Date | null;
      completed_at: Date | null;
      assignee: { residence_code: string | null } | null;
    }[];

    const seenResidences = new Set<string>();
    const currentRows: CleaningDutyRowDto[] = [];

    for (const row of rows) {
      const residenceCode = (row.assignee?.residence_code ?? '').trim();
      if (!residenceCode || seenResidences.has(residenceCode)) continue;
      seenResidences.add(residenceCode);

      currentRows.push({
        id: row.id,
        residenceCode,
        cycleNo: row.cycle_no,
        assigneeId: row.assignee_id,
        isDone: Boolean(row.is_done),
        cleanedOn: row.cleaned_on ? row.cleaned_on.toISOString() : null,
        completedAt: row.completed_at ? row.completed_at.toISOString() : null,
      });
    }

    return NextResponse.json({ ok: true as const, rows: currentRows }, { status: 200 });
  } catch (error) {
    logError('cleaningDuty.error', {
      operation: 'fetchCurrent',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
