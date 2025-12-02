import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getSystemAdminApiContext,
  SystemAdminApiError,
} from "@/src/lib/auth/systemAdminAuth";

export async function POST(request: NextRequest) {
  try {
    const { adminClient } = await getSystemAdminApiContext();

    let payload: any;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: "Invalid request body" },
        { status: 400 },
      );
    }

    const { tenantCode, tenantName, timezone } = payload ?? {};

    if (!tenantCode || !tenantName || !timezone) {
      return NextResponse.json(
        { ok: false, message: "必須項目が不足しています。" },
        { status: 400 },
      );
    }

    const newTenantId = randomUUID();
    const nowIso = new Date().toISOString();

    const { data: existing } = await adminClient
      .from("tenants")
      .select("id")
      .eq("tenant_code", tenantCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ok: false, message: "このテナントコードは既に使用されています。" },
        { status: 409 },
      );
    }

    const { data, error } = await adminClient
      .from("tenants")
      .insert({
        id: newTenantId,
        tenant_code: tenantCode,
        tenant_name: tenantName,
        timezone,
        created_at: nowIso,
        updated_at: nowIso,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !data) {
      if (error) {
        console.error("Create tenant error:", error);
      }
      return NextResponse.json(
        {
          ok: false,
          message:
            "テナントの登録に失敗しました。時間をおいて再度お試しください。",
        },
        { status: 500 },
      );
    }

    const defaultCategories = [
      { id: randomUUID(), tenant_id: data.id, category_key: 'important', category_name: '重要なお知らせ', display_order: 1, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, category_key: 'circular', category_name: '回覧板', display_order: 2, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, category_key: 'event', category_name: 'イベント', display_order: 3, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, category_key: 'rules', category_name: 'ルール・規約', display_order: 4, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, category_key: 'question', category_name: '質問', display_order: 5, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, category_key: 'request', category_name: '要望', display_order: 6, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, category_key: 'other', category_name: 'その他', display_order: 7, status: 'active', updated_at: nowIso },
    ];

    const { error: categoryError } = await adminClient
      .from("board_categories")
      .insert(defaultCategories);

    if (categoryError) {
      console.error("Failed to create default categories:", categoryError);
      await adminClient.from("tenants").delete().eq("id", data.id);
      return NextResponse.json(
        { ok: false, message: "テナントの初期設定（カテゴリ作成）に失敗しました。" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, tenantId: data.id });
  } catch (error) {
    if (error instanceof SystemAdminApiError) {
      if (error.code === 'unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    throw error;
  }
}
