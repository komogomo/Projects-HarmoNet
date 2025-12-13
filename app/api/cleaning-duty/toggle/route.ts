import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logError } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

type CleaningDutyToggleAuthResult =
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
        residenceCode: string;
      };
    };

async function resolveCleaningDutyToggleAuthContext(): Promise<CleaningDutyToggleAuthResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('cleaningDuty.error', {
      operation: 'toggleDuty',
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
    .select('id, tenant_id, group_code, residence_code')
    .eq('email', email)
    .maybeSingle();

  if (appUserError || !appUser) {
    logError('cleaningDuty.error', {
      operation: 'toggleDuty',
      errorCode: 'unauthorized',
      reason: 'user_not_found',
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
      operation: 'toggleDuty',
      errorCode: 'unauthorized',
      userId: appUser.id,
    });
    return { error: { status: 403, body: { errorCode: 'unauthorized' } } };
  }

  const tenantId = membership.tenant_id as string;
  const groupCodeRaw = (appUser as any).group_code as string | null | undefined;
  const residenceCodeRaw = (appUser as any).residence_code as string | null | undefined;

  const groupCode = typeof groupCodeRaw === 'string' ? groupCodeRaw.trim() : '';
  const residenceCode = typeof residenceCodeRaw === 'string' ? residenceCodeRaw.trim() : '';

  if (!groupCode || !residenceCode) {
    logError('cleaningDuty.error', {
      operation: 'toggleDuty',
      errorCode: 'no_group',
      userId: appUser.id,
      tenantId,
    });
    return { error: { status: 403, body: { errorCode: 'no_group' } } };
  }

  return {
    context: {
      tenantId,
      userId: appUser.id as string,
      groupCode,
      residenceCode,
    },
  };
}

export async function POST(req: Request) {
  try {
    const auth = await resolveCleaningDutyToggleAuthContext();

    if ('error' in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, userId, groupCode, residenceCode } = auth.context;

    const body = (await req.json().catch(() => null)) as
      | {
          id?: string;
          isDone?: boolean;
        }
      | null;

    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const isDone = typeof body?.isDone === 'boolean' ? body.isDone : null;

    if (!id || typeof isDone !== 'boolean') {
      return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
    }

    const duty = (await prisma.cleaning_duties.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        group_code: groupCode,
      },
      select: {
        residence_code: true,
        completed_at: true,
      },
    } as any)) as { residence_code: string; completed_at: Date | null } | null;

    if (!duty) {
      return NextResponse.json({ errorCode: 'not_found' }, { status: 404 });
    }

    if (duty.completed_at) {
      return NextResponse.json({ errorCode: 'cannot_toggle_completed' }, { status: 400 });
    }

    if ((duty.residence_code ?? '').trim() !== residenceCode) {
      logError('cleaningDuty.error', {
        operation: 'toggleDuty',
        errorCode: 'forbidden',
        tenantId,
        userId,
        groupCode,
        dutyId: id,
        dutyResidenceCode: duty.residence_code,
        userResidenceCode: residenceCode,
      });
      return NextResponse.json({ errorCode: 'forbidden' }, { status: 403 });
    }

    const cleanedOn = isDone ? new Date() : null;

    const result = await prisma.cleaning_duties.updateMany({
      where: {
        id,
        tenant_id: tenantId,
        group_code: groupCode,
        residence_code: residenceCode,
        completed_at: null,
      },
      data: {
        is_done: isDone,
        cleaned_on: cleanedOn,
      },
    } as any);

    if (result.count !== 1) {
      logError('cleaningDuty.error', {
        operation: 'toggleDuty',
        tenantId,
        userId,
        groupCode,
        dutyId: id,
        reason: 'no_rows_updated',
        updatedCount: result.count,
        isDone,
      });
      return NextResponse.json({ errorCode: 'toggle_failed' }, { status: 409 });
    }

    return NextResponse.json(
      { ok: true as const, cleanedOn: cleanedOn ? cleanedOn.toISOString() : null },
      { status: 200 },
    );
  } catch (error) {
    logError('cleaningDuty.error', {
      operation: 'toggleDuty',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
