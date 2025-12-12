import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getSystemAdminApiContext,
  SystemAdminApiError,
} from "@/src/lib/auth/systemAdminAuth";
import { logError } from '@/src/lib/logging/log.util';

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
        logError('sys-admin.tenants.create_failed', {
          reason: (error as any)?.message ?? 'unknown',
        });
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

    // Create Tenant Settings
    const { error: settingsError } = await adminClient
      .from("tenant_settings")
      .insert({
        id: randomUUID(),
        tenant_id: data.id,
        config_json: {
          board: {
            moderation: {
              enabled: true,
              level: 1,
            },
          },
          facility: {
            usageNotes: {},
          },
        },
        default_language: "ja",
        status: "active",
        created_at: nowIso,
        updated_at: nowIso,
      });

    if (settingsError) {
      logError('sys-admin.tenants.create_settings_failed', {
        tenantId: data.id,
        reason: (settingsError as any)?.message ?? 'unknown',
      });
      // Rollback tenant
      await adminClient.from("tenants").delete().eq("id", data.id);
      return NextResponse.json(
        { ok: false, message: "テナントの初期設定（設定情報作成）に失敗しました。" },
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
      logError('sys-admin.tenants.create_default_categories_failed', {
        tenantId: data.id,
        reason: (categoryError as any)?.message ?? 'unknown',
      });
      await adminClient.from("tenants").delete().eq("id", data.id);
      return NextResponse.json(
        { ok: false, message: "テナントの初期設定（カテゴリ作成）に失敗しました。" },
        { status: 500 },
      );
    }

    // Create Default Shortcut Menu
    const defaultShortcuts = [
      { id: randomUUID(), tenant_id: data.id, feature_key: 'home', label_key: 'nav.home', icon: 'Home', display_order: 1, enabled: true, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, feature_key: 'board', label_key: 'nav.board', icon: 'MessageSquare', display_order: 2, enabled: true, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, feature_key: 'facility', label_key: 'nav.facility', icon: 'Calendar', display_order: 3, enabled: true, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, feature_key: 'mypage', label_key: 'nav.mypage', icon: 'User', display_order: 4, enabled: true, status: 'active', updated_at: nowIso },
      { id: randomUUID(), tenant_id: data.id, feature_key: 'logout', label_key: 'nav.logout', icon: 'LogOut', display_order: 5, enabled: true, status: 'active', updated_at: nowIso },
    ];

    const { error: shortcutError } = await adminClient
      .from("tenant_shortcut_menu")
      .insert(defaultShortcuts);

    if (shortcutError) {
      logError('sys-admin.tenants.create_default_shortcuts_failed', {
        tenantId: data.id,
        reason: (shortcutError as any)?.message ?? 'unknown',
      });
      await adminClient.from("tenants").delete().eq("id", data.id);
      return NextResponse.json(
        { ok: false, message: "テナントの初期設定（ショートカット作成）に失敗しました。" },
        { status: 500 },
      );
    }

    const { data: defaultTranslations, error: defaultTranslationsError } = await adminClient
      .from("static_translation_defaults")
      .select("screen_id, screen_key, message_key, text_ja, text_en, text_zh");

    if (defaultTranslationsError) {
      logError('sys-admin.tenants.read_static_translation_defaults_failed', {
        tenantId: data.id,
        reason: (defaultTranslationsError as any)?.message ?? 'unknown',
      });
      await adminClient.from("tenants").delete().eq("id", data.id);
      return NextResponse.json(
        { ok: false, message: "テナントの初期設定（翻訳マスタ読込）に失敗しました。" },
        { status: 500 },
      );
    }

    if (defaultTranslations && defaultTranslations.length > 0) {
      const seedRows = (defaultTranslations as {
        screen_id: string | null;
        screen_key: string | null;
        message_key: string | null;
        text_ja: string | null;
        text_en: string | null;
        text_zh: string | null;
      }[]).map((row) => ({
        id: randomUUID(),
        tenant_id: data.id,
        screen_id: row.screen_id,
        screen_key: row.screen_key,
        message_key: row.message_key,
        text_ja: row.text_ja,
        text_en: row.text_en,
        text_zh: row.text_zh,
        status: "active",
        created_at: nowIso,
        updated_at: nowIso,
      }));

      const { error: seedError } = await adminClient
        .from("tenant_static_translations")
        .insert(seedRows);

      if (seedError) {
        logError('sys-admin.tenants.seed_tenant_static_translations_failed', {
          tenantId: data.id,
          reason: (seedError as any)?.message ?? 'unknown',
        });
        await adminClient.from("tenants").delete().eq("id", data.id);
        return NextResponse.json(
          { ok: false, message: "テナントの初期設定（翻訳データ作成）に失敗しました。" },
          { status: 500 },
        );
      }
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
