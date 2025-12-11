import { NextRequest, NextResponse } from 'next/server';
import { getTenantAdminApiContext, TenantAdminApiError } from '@/src/lib/auth/tenantAdminAuth';
import { prisma } from '@/src/server/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const { tenantId, supabaseAdmin } = await getTenantAdminApiContext();

    const { data, error } = await supabaseAdmin
      .from('tenant_residences')
      .select('id, residence_code')
      .eq('tenant_id', tenantId)
      .order('residence_code', { ascending: true });

    if (error) {
      console.error('Tenant residences fetch error:', error);
      return NextResponse.json({ ok: false, message: '住居番号一覧の取得に失敗しました。' }, { status: 500 });
    }

    const result = (data ?? []).map((row: any) => ({
      id: row.id as string,
      residenceCode: (row.residence_code as string) ?? '',
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

    console.error('Tenant residences GET unexpected error:', error);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'サーバ内部エラーが発生しました。' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, supabaseAdmin } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { residenceCode?: string } | null;
    const residenceCodeRaw = typeof body?.residenceCode === 'string' ? body.residenceCode.trim() : '';

    if (!residenceCodeRaw) {
      return NextResponse.json(
        { ok: false, errorCode: 'VALIDATION_ERROR', message: '住居番号を入力してください。' },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('tenant_residences')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('residence_code', residenceCodeRaw)
      .maybeSingle();

    if (existingError) {
      console.error('Tenant residences duplicate check error:', existingError);
      return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: '重複チェックに失敗しました。' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { ok: false, errorCode: 'CONFLICT', message: 'この住居番号は既に登録されています。' },
        { status: 409 },
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('tenant_residences')
      .insert({ tenant_id: tenantId, residence_code: residenceCodeRaw })
      .select('id, residence_code')
      .single();

    if (insertError || !inserted) {
      console.error('Tenant residences insert error:', insertError);
      return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: '住居番号の登録に失敗しました。' }, { status: 500 });
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
        return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ ok: false, errorCode: 'tenant_not_found', message: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ ok: false, errorCode: 'forbidden', message: 'Forbidden' }, { status: 403 });
      }
    }

    console.error('Tenant residences POST unexpected error:', error);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'サーバ内部エラーが発生しました。' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { residenceId?: string; residenceCode?: string } | null;
    const residenceId = typeof body?.residenceId === 'string' ? body.residenceId.trim() : '';
    const newResidenceCode = typeof body?.residenceCode === 'string' ? body.residenceCode.trim() : '';

    if (!residenceId || !newResidenceCode) {
      return NextResponse.json(
        { ok: false, errorCode: 'VALIDATION_ERROR', message: '住居番号と対象行を指定してください。' },
        { status: 400 },
      );
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
      return NextResponse.json(
        { ok: false, errorCode: 'NOT_FOUND', message: '指定された住居番号が見つかりません。' },
        { status: 404 },
      );
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
      return NextResponse.json(
        { ok: false, errorCode: 'CONFLICT', message: '同じ住居番号が既に登録されています。' },
        { status: 409 },
      );
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
        return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ ok: false, errorCode: 'tenant_not_found', message: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ ok: false, errorCode: 'forbidden', message: 'Forbidden' }, { status: 403 });
      }
    }

    console.error('Tenant residences PUT unexpected error:', error);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: '住居番号の更新に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAdminApiContext();

    const body = (await request.json().catch(() => null)) as { residenceId?: string } | null;
    const residenceId = typeof body?.residenceId === 'string' ? body.residenceId.trim() : '';

    if (!residenceId) {
      return NextResponse.json(
        { ok: false, errorCode: 'VALIDATION_ERROR', message: '削除対象の住居番号を指定してください。' },
        { status: 400 },
      );
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
      return NextResponse.json(
        { ok: false, errorCode: 'NOT_FOUND', message: '指定された住居番号が見つかりません。' },
        { status: 404 },
      );
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
      return NextResponse.json(
        {
          ok: false,
          errorCode: 'RESIDENCE_IN_USE',
          message: 'この住居番号は利用中のため削除できません。',
        },
        { status: 400 },
      );
    }

    await prisma.tenant_residences.delete({
      where: { id: residenceId },
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

    console.error('Tenant residences DELETE unexpected error:', error);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: '住居番号の削除に失敗しました。' }, { status: 500 });
  }
}
