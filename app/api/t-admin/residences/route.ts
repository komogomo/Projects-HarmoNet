import { NextRequest, NextResponse } from 'next/server';
import { getTenantAdminApiContext, TenantAdminApiError } from '@/src/lib/auth/tenantAdminAuth';
import { prisma } from '@/src/server/db/prisma';
import { logError } from '@/src/lib/logging/log.util';

const errorJson = (status: number, errorCode: string, messageKey: string) =>
  NextResponse.json({ ok: false, errorCode, messageKey, message: messageKey }, { status });

export async function GET(request: NextRequest) {
  try {
    const { tenantId, supabaseAdmin } = await getTenantAdminApiContext();

    const { data, error } = await supabaseAdmin
      .from('tenant_residences')
      .select('id, residence_code')
      .eq('tenant_id', tenantId)
      .order('residence_code', { ascending: true });

    if (error) {
      logError('tadmin.residences.fetch_failed', {
        errorMessage: (error as any)?.message ?? 'unknown',
      });
      return errorJson(500, 'INTERNAL_ERROR', 'tadmin.residences.error.listFailed');
    }

    const result = (data ?? []).map((row: any) => ({
      id: row.id as string,
      residenceCode: (row.residence_code as string) ?? '',
    }));

    return NextResponse.json({ ok: true, items: result });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return errorJson(401, 'unauthorized', 'tadmin.residences.error.listFailed');
      }
      if (error.code === 'tenant_not_found') {
        return errorJson(403, 'tenant_not_found', 'tadmin.residences.error.listFailed');
      }
      if (error.code === 'forbidden') {
        return errorJson(403, 'forbidden', 'tadmin.residences.error.listFailed');
      }
    }

    logError('tadmin.residences.get.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return errorJson(500, 'INTERNAL_ERROR', 'tadmin.residences.error.listFailed');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, supabaseAdmin } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { residenceCode?: string } | null;
    const residenceCodeRaw = typeof body?.residenceCode === 'string' ? body.residenceCode.trim() : '';

    if (!residenceCodeRaw) {
      return errorJson(400, 'VALIDATION_ERROR', 'tadmin.residences.error.residenceCodeRequired');
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('tenant_residences')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('residence_code', residenceCodeRaw)
      .maybeSingle();

    if (existingError) {
      logError('tadmin.residences.duplicate_check_failed', {
        errorMessage: (existingError as any)?.message ?? 'unknown',
      });
      return errorJson(500, 'INTERNAL_ERROR', 'tadmin.residences.error.registerFailed');
    }

    if (existing) {
      return errorJson(409, 'CONFLICT', 'tadmin.residences.error.registerFailed');
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('tenant_residences')
      .insert({ tenant_id: tenantId, residence_code: residenceCodeRaw })
      .select('id, residence_code')
      .single();

    if (insertError || !inserted) {
      logError('tadmin.residences.insert_failed', {
        errorMessage: (insertError as any)?.message ?? 'unknown',
      });
      return errorJson(500, 'INTERNAL_ERROR', 'tadmin.residences.error.registerFailed');
    }

    return NextResponse.json(
      {
        ok: true,
        item: {
          id: inserted.id as string,
          residenceCode: (inserted.residence_code as string) ?? '',
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return errorJson(401, 'unauthorized', 'tadmin.residences.error.registerFailed');
      }
      if (error.code === 'tenant_not_found') {
        return errorJson(403, 'tenant_not_found', 'tadmin.residences.error.registerFailed');
      }
      if (error.code === 'forbidden') {
        return errorJson(403, 'forbidden', 'tadmin.residences.error.registerFailed');
      }
    }

    logError('tadmin.residences.post.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return errorJson(500, 'INTERNAL_ERROR', 'tadmin.residences.error.registerFailed');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { residenceId?: string; residenceCode?: string } | null;
    const residenceId = typeof body?.residenceId === 'string' ? body.residenceId.trim() : '';
    const newResidenceCode = typeof body?.residenceCode === 'string' ? body.residenceCode.trim() : '';

    if (!residenceId || !newResidenceCode) {
      return errorJson(400, 'VALIDATION_ERROR', 'tadmin.residences.error.updateTargetNotSelected');
    }

    const existing = await prisma.tenant_residences.findFirst({
      where: {
        id: residenceId,
        tenant_id: tenantId,
      },
      select: {
        residence_code: true,
      },
    });

    if (!existing) {
      return errorJson(404, 'NOT_FOUND', 'tadmin.residences.error.updateTargetMissing');
    }

    const oldResidenceCode = existing.residence_code;

    if (oldResidenceCode === newResidenceCode) {
      return NextResponse.json({ ok: true, item: { id: residenceId, residenceCode: newResidenceCode } });
    }

    const conflict = await prisma.tenant_residences.findFirst({
      where: {
        tenant_id: tenantId,
        residence_code: newResidenceCode,
        NOT: {
          id: residenceId,
        },
      },
      select: { id: true },
    });

    if (conflict) {
      return errorJson(409, 'CONFLICT', 'tadmin.residences.error.updateFailed');
    }

    await prisma.$transaction([
      prisma.tenant_residences.update({
        where: { id: residenceId },
        data: {
          residence_code: newResidenceCode,
          updated_at: new Date(),
        },
      }),
      prisma.users.updateMany({
        where: {
          tenant_id: tenantId,
          residence_code: oldResidenceCode,
        },
        data: {
          residence_code: newResidenceCode,
        },
      }),
      prisma.cleaning_duties.updateMany({
        where: {
          tenant_id: tenantId,
          residence_code: oldResidenceCode,
        },
        data: {
          residence_code: newResidenceCode,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, item: { id: residenceId, residenceCode: newResidenceCode } });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return errorJson(401, 'unauthorized', 'tadmin.residences.error.updateFailed');
      }
      if (error.code === 'tenant_not_found') {
        return errorJson(403, 'tenant_not_found', 'tadmin.residences.error.updateFailed');
      }
      if (error.code === 'forbidden') {
        return errorJson(403, 'forbidden', 'tadmin.residences.error.updateFailed');
      }
    }

    logError('tadmin.residences.put.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return errorJson(500, 'INTERNAL_ERROR', 'tadmin.residences.error.updateFailed');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { residenceId?: string } | null;
    const residenceId = typeof body?.residenceId === 'string' ? body.residenceId.trim() : '';

    if (!residenceId) {
      return errorJson(400, 'VALIDATION_ERROR', 'tadmin.residences.error.deleteFailed');
    }

    const target = await prisma.tenant_residences.findFirst({
      where: {
        id: residenceId,
        tenant_id: tenantId,
      },
      select: {
        residence_code: true,
      },
    });

    if (!target) {
      return errorJson(404, 'NOT_FOUND', 'tadmin.residences.error.updateTargetMissing');
    }

    const residenceCode = target.residence_code;

    const [userCount, dutyCount] = await Promise.all([
      prisma.users.count({
        where: {
          tenant_id: tenantId,
          residence_code: residenceCode,
        },
      }),
      prisma.cleaning_duties.count({
        where: {
          tenant_id: tenantId,
          residence_code: residenceCode,
        },
      }),
    ]);

    if (userCount > 0 || dutyCount > 0) {
      return errorJson(400, 'RESIDENCE_IN_USE', 'tadmin.residences.error.deleteFailed');
    }

    await prisma.tenant_residences.delete({
      where: { id: residenceId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return errorJson(401, 'unauthorized', 'tadmin.residences.error.deleteFailed');
      }
      if (error.code === 'tenant_not_found') {
        return errorJson(403, 'tenant_not_found', 'tadmin.residences.error.deleteFailed');
      }
      if (error.code === 'forbidden') {
        return errorJson(403, 'forbidden', 'tadmin.residences.error.deleteFailed');
      }
    }

    logError('tadmin.residences.delete.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return errorJson(500, 'INTERNAL_ERROR', 'tadmin.residences.error.deleteFailed');
  }
}
