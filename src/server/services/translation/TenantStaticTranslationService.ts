import type { SupabaseClient } from '@supabase/supabase-js';

export type TenantStaticTranslationsByLocale = {
  ja: Record<string, string>;
  en: Record<string, string>;
  zh: Record<string, string>;
};

export interface TenantStaticTranslationServiceDeps {
  supabase: SupabaseClient;
}

/**
 * テナント固有の静的翻訳テキストを取得するサービス。
 *
 * - tenant_static_translations テーブルを参照し、指定テナント・画面単位で
 *   message_key ごとの JA/EN/ZH 文言をまとめて返す。
 * - ランタイムでは、クライアント側の currentLocale に応じてどの言語を使うか選択する想定。
 */
export class TenantStaticTranslationService {
  private readonly supabase: SupabaseClient;

  constructor(deps: TenantStaticTranslationServiceDeps) {
    this.supabase = deps.supabase;
  }

  async getMessagesForScreen(params: {
    tenantId: string;
    screenKey: string;
  }): Promise<TenantStaticTranslationsByLocale> {
    const { tenantId, screenKey } = params;

    const empty: TenantStaticTranslationsByLocale = {
      ja: {},
      en: {},
      zh: {},
    };

    const { data, error } = await this.supabase
      .from('tenant_static_translations')
      .select('message_key, text_ja, text_en, text_zh')
      .eq('tenant_id', tenantId)
      .eq('screen_key', screenKey)
      .eq('status', 'active');

    if (error || !Array.isArray(data)) {
      return empty;
    }

    const result: TenantStaticTranslationsByLocale = {
      ja: {},
      en: {},
      zh: {},
    };

    for (const row of data as {
      message_key: string | null;
      text_ja: string | null;
      text_en: string | null;
      text_zh: string | null;
    }[]) {
      const key = row.message_key ?? '';
      if (!key) continue;

      const textJa = (row.text_ja ?? '').trim();
      const textEn = (row.text_en ?? '').trim();
      const textZh = (row.text_zh ?? '').trim();

      // JA はそのまま or キーをフォールバック
      result.ja[key] = textJa && textJa !== key ? textJa : '';
      // EN/ZH は、それぞれの言語が未入力ならキーをそのまま表示し、
      // 別言語のテキストにはフォールバックしない（マスタ不備を隠さない）
      result.en[key] = textEn && textEn !== key ? textEn : '';
      result.zh[key] = textZh && textZh !== key ? textZh : '';
    }

    return result;
  }
}
