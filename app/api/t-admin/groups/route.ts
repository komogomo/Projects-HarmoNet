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
      .from('tenant_groups')
      .select('id, group_code')
      .eq('tenant_id', tenantId)
      .order('group_code', { ascending: true });

    if (error) {
      logError('tadmin.groups.fetch_failed', {
        errorMessage: (error as any)?.message ?? 'unknown',
      });
      return errorJson(500, 'INTERNAL_ERROR', 'tadmin.groups.error.listFailed');
    }

    const result = (data ?? []).map((row: any) => ({
      id: row.id as string,
      groupCode: (row.group_code as string) ?? '',
    }));

    return NextResponse.json({ ok: true, items: result });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return errorJson(401, 'unauthorized', 'tadmin.groups.error.listFailed');
      }
      if (error.code === 'tenant_not_found') {
        return errorJson(403, 'tenant_not_found', 'tadmin.groups.error.listFailed');
      }
      if (error.code === 'forbidden') {
        return errorJson(403, 'forbidden', 'tadmin.groups.error.listFailed');
      }
    }

    logError('tadmin.groups.get.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return errorJson(500, 'INTERNAL_ERROR', 'tadmin.groups.error.listFailed');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, supabaseAdmin } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { groupCode?: string } | null;
    const groupCodeRaw = typeof body?.groupCode === 'string' ? body.groupCode.trim() : '';

    if (!groupCodeRaw) {
      return errorJson(400, 'VALIDATION_ERROR', 'tadmin.groups.error.groupIdRequired');
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('tenant_groups')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('group_code', groupCodeRaw)
      .maybeSingle();

    if (existingError) {
      logError('tadmin.groups.duplicate_check_failed', {
        errorMessage: (existingError as any)?.message ?? 'unknown',
      });
      return errorJson(500, 'INTERNAL_ERROR', 'tadmin.groups.error.registerFailed');
    }

    if (existing) {
      return errorJson(409, 'CONFLICT', 'tadmin.groups.error.registerFailed');
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('tenant_groups')
      .insert({ tenant_id: tenantId, group_code: groupCodeRaw })
      .select('id, group_code')
      .single();

    if (insertError || !inserted) {
      logError('tadmin.groups.insert_failed', {
        errorMessage: (insertError as any)?.message ?? 'unknown',
      });
      return errorJson(500, 'INTERNAL_ERROR', 'tadmin.groups.error.registerFailed');
    }

    return NextResponse.json(
      {
        ok: true,
        item: {
          id: inserted.id as string,
          groupCode: (inserted.group_code as string) ?? '',
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return errorJson(401, 'unauthorized', 'tadmin.groups.error.registerFailed');
      }
      if (error.code === 'tenant_not_found') {
        return errorJson(403, 'tenant_not_found', 'tadmin.groups.error.registerFailed');
      }
      if (error.code === 'forbidden') {
        return errorJson(403, 'forbidden', 'tadmin.groups.error.registerFailed');
      }
    }

    logError('tadmin.groups.post.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return errorJson(500, 'INTERNAL_ERROR', 'tadmin.groups.error.registerFailed');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { groupId?: string; groupCode?: string } | null;
    const groupId = typeof body?.groupId === 'string' ? body.groupId.trim() : '';
    const newGroupCode = typeof body?.groupCode === 'string' ? body.groupCode.trim() : '';

    if (!groupId || !newGroupCode) {
      return errorJson(400, 'VALIDATION_ERROR', 'tadmin.groups.error.updateTargetNotSelected');
    }

    const existing = await prisma.tenant_groups.findFirst({
      where: {
        id: groupId,
        tenant_id: tenantId,
      },
      select: {
        group_code: true,
      },
    });

    if (!existing) {
      return errorJson(404, 'NOT_FOUND', 'tadmin.groups.error.updateTargetMissing');
    }

    const oldGroupCode = existing.group_code;

    if (oldGroupCode === newGroupCode) {
      return NextResponse.json({ ok: true, item: { id: groupId, groupCode: newGroupCode } });
    }

    const conflict = await prisma.tenant_groups.findFirst({
      where: {
        tenant_id: tenantId,
        group_code: newGroupCode,
        NOT: {
          id: groupId,
        },
      },
      select: { id: true },
    });

    if (conflict) {
      return errorJson(409, 'CONFLICT', 'tadmin.groups.error.updateFailed');
    }

    await prisma.$transaction([
      prisma.tenant_groups.update({
        where: { id: groupId },
        data: {
          group_code: newGroupCode,
          updated_at: new Date(),
        },
      }),
      prisma.users.updateMany({
        where: {
          tenant_id: tenantId,
          group_code: oldGroupCode,
        },
        data: {
          group_code: newGroupCode,
        },
      }),
      prisma.cleaning_duties.updateMany({
        where: {
          tenant_id: tenantId,
          group_code: oldGroupCode,
        },
        data: {
          group_code: newGroupCode,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, item: { id: groupId, groupCode: newGroupCode } });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return errorJson(401, 'unauthorized', 'tadmin.groups.error.updateFailed');
      }
      if (error.code === 'tenant_not_found') {
        return errorJson(403, 'tenant_not_found', 'tadmin.groups.error.updateFailed');
      }
      if (error.code === 'forbidden') {
        return errorJson(403, 'forbidden', 'tadmin.groups.error.updateFailed');
      }
    }

    logError('tadmin.groups.put.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return errorJson(500, 'INTERNAL_ERROR', 'tadmin.groups.error.updateFailed');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { groupId?: string } | null;
    const groupId = typeof body?.groupId === 'string' ? body.groupId.trim() : '';

    if (!groupId) {
      return errorJson(400, 'VALIDATION_ERROR', 'tadmin.groups.error.deleteFailed');
    }

    const target = await prisma.tenant_groups.findFirst({
      where: {
        id: groupId,
        tenant_id: tenantId,
      },
      select: {
        group_code: true,
      },
    });

    if (!target) {
      return errorJson(404, 'NOT_FOUND', 'tadmin.groups.error.updateTargetMissing');
    }

    const groupCode = target.group_code;

    const [userCount, dutyCount] = await Promise.all([
      prisma.users.count({
        where: {
          tenant_id: tenantId,
          group_code: groupCode,
        },
      }),
      prisma.cleaning_duties.count({
        where: {
          tenant_id: tenantId,
          group_code: groupCode,
        },
      }),
    ]);

    if (userCount > 0 || dutyCount > 0) {
      return errorJson(400, 'GROUP_IN_USE', 'tadmin.groups.error.deleteFailed');
    }

    await prisma.tenant_groups.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return errorJson(401, 'unauthorized', 'tadmin.groups.error.deleteFailed');
      }
      if (error.code === 'tenant_not_found') {
        return errorJson(403, 'tenant_not_found', 'tadmin.groups.error.deleteFailed');
      }
      if (error.code === 'forbidden') {
        return errorJson(403, 'forbidden', 'tadmin.groups.error.deleteFailed');
      }
    }

    logError('tadmin.groups.delete.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return errorJson(500, 'INTERNAL_ERROR', 'tadmin.groups.error.deleteFailed');
  }
}
