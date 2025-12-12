import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logError } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

interface CleaningDutyAssigneeCandidateDto {
  id: string;
  firstName: string;
  residenceCode: string;
}

type CleaningDutyAssigneeAuthResult =
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
      };
    };

async function resolveCleaningDutyAssigneeAuthContext(): Promise<CleaningDutyAssigneeAuthResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('cleaningDuty.error', {
      operation: 'fetchAssigneeCandidates',
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
      operation: 'fetchAssigneeCandidates',
      errorCode: 'unauthorized',
      reason: 'user_not_found',
    });
    return { error: { status: 403, body: { errorCode: 'unauthorized' } } };
  }

  const tenantIdRaw = (appUser as any).tenant_id as string | null | undefined;
  const groupCodeRaw = (appUser as any).group_code as string | null | undefined;

  if (!tenantIdRaw || !groupCodeRaw) {
    logError('cleaningDuty.error', {
      operation: 'fetchAssigneeCandidates',
      errorCode: 'no_group',
      userId: appUser.id,
    });
    return { error: { status: 403, body: { errorCode: 'no_group' } } };
  }

  return {
    context: {
      tenantId: tenantIdRaw,
      userId: appUser.id as string,
      groupCode: groupCodeRaw,
    },
  };
}

export async function GET() {
  try {
    const auth = await resolveCleaningDutyAssigneeAuthContext();

    if ('error' in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, groupCode, userId } = auth.context;

    const users = (await prisma.users.findMany({
      where: {
        tenant_id: tenantId,
        group_code: groupCode,
        status: 'active',
      },
      select: {
        id: true,
        first_name: true,
        residence_code: true,
      },
      orderBy: [
        { residence_code: 'asc' },
        { first_name: 'asc' },
      ],
    } as any)) as { id: string; first_name: string | null; residence_code: string | null }[];

    const candidates: CleaningDutyAssigneeCandidateDto[] = [];

    for (const row of users) {
      const id = row.id;
      const firstName = (row.first_name ?? '').trim();
      const residenceCode = (row.residence_code ?? '').trim();

      if (!id || !firstName || !residenceCode) {
        continue;
      }

      candidates.push({
        id,
        firstName,
        residenceCode,
      });
    }

    return NextResponse.json({ ok: true as const, candidates });
  } catch (error) {
    logError('cleaningDuty.error', {
      operation: 'fetchAssigneeCandidates',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
