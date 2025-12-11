import { NextRequest, NextResponse } from 'next/server';
import { getTenantAdminApiContext, TenantAdminApiError } from '@/src/lib/auth/tenantAdminAuth';
import { prisma } from '@/src/server/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const { tenantId, supabaseAdmin } = await getTenantAdminApiContext();

    const { data, error } = await supabaseAdmin
      .from('tenant_groups')
      .select('id, group_code')
      .eq('tenant_id', tenantId)
      .order('group_code', { ascending: true });

    if (error) {
      console.error('Tenant groups fetch error:', error);
      return NextResponse.json({ ok: false, message: 'グループID一覧の取得に失敗しました。' }, { status: 500 });
    }

    const result = (data ?? []).map((row: any) => ({
      id: row.id as string,
      groupCode: (row.group_code as string) ?? '',
    }));

    return NextResponse.json({ ok: true, items: result });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ ok: false, errorCode: 'tenant_not_found', message: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ ok: false, errorCode: 'forbidden', message: 'Forbidden' }, { status: 403 });
      }
    }

    console.error('Tenant groups GET unexpected error:', error);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'サーバ内部エラーが発生しました。' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, supabaseAdmin } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { groupCode?: string } | null;
    const groupCodeRaw = typeof body?.groupCode === 'string' ? body.groupCode.trim() : '';

    if (!groupCodeRaw) {
      return NextResponse.json(
        { ok: false, errorCode: 'VALIDATION_ERROR', message: 'グループIDを入力してください。' },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('tenant_groups')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('group_code', groupCodeRaw)
      .maybeSingle();

    if (existingError) {
      console.error('Tenant groups duplicate check error:', existingError);
      return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: '重複チェックに失敗しました。' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { ok: false, errorCode: 'CONFLICT', message: 'このグループIDは既に登録されています。' },
        { status: 409 },
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('tenant_groups')
      .insert({ tenant_id: tenantId, group_code: groupCodeRaw })
      .select('id, group_code')
      .single();

    if (insertError || !inserted) {
      console.error('Tenant groups insert error:', insertError);
      return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'グループIDの登録に失敗しました。' }, { status: 500 });
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
        return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ ok: false, errorCode: 'tenant_not_found', message: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ ok: false, errorCode: 'forbidden', message: 'Forbidden' }, { status: 403 });
      }
    }

    console.error('Tenant groups POST unexpected error:', error);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'サーバ内部エラーが発生しました。' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { groupId?: string; groupCode?: string } | null;
    const groupId = typeof body?.groupId === 'string' ? body.groupId.trim() : '';
    const newGroupCode = typeof body?.groupCode === 'string' ? body.groupCode.trim() : '';

    if (!groupId || !newGroupCode) {
      return NextResponse.json(
        { ok: false, errorCode: 'VALIDATION_ERROR', message: 'グループIDと対象行を指定してください。' },
        { status: 400 },
      );
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
      return NextResponse.json(
        { ok: false, errorCode: 'NOT_FOUND', message: '指定されたグループIDが見つかりません。' },
        { status: 404 },
      );
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
      return NextResponse.json(
        { ok: false, errorCode: 'CONFLICT', message: '同じグループIDが既に登録されています。' },
        { status: 409 },
      );
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
        return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ ok: false, errorCode: 'tenant_not_found', message: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ ok: false, errorCode: 'forbidden', message: 'Forbidden' }, { status: 403 });
      }
    }

    console.error('Tenant groups PUT unexpected error:', error);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'グループIDの更新に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { groupId?: string } | null;
    const groupId = typeof body?.groupId === 'string' ? body.groupId.trim() : '';

    if (!groupId) {
      return NextResponse.json(
        { ok: false, errorCode: 'VALIDATION_ERROR', message: '削除対象のグループを指定してください。' },
        { status: 400 },
      );
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
      return NextResponse.json(
        { ok: false, errorCode: 'NOT_FOUND', message: '指定されたグループIDが見つかりません。' },
        { status: 404 },
      );
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
      return NextResponse.json(
        {
          ok: false,
          errorCode: 'GROUP_IN_USE',
          message: 'このグループIDは利用中のため削除できません。',
        },
        { status: 400 },
      );
    }

    await prisma.tenant_groups.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ ok: false, errorCode: 'tenant_not_found', message: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ ok: false, errorCode: 'forbidden', message: 'Forbidden' }, { status: 403 });
      }
    }

    console.error('Tenant groups DELETE unexpected error:', error);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'グループIDの削除に失敗しました。' }, { status: 500 });
  }
}
