import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logError } from '@/src/lib/logging/log.util';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get('lang');

    const langCode = lang === 'en' || lang === 'zh' ? lang : 'ja';

    const supabaseAdmin = createSupabaseServiceRoleClient();
    const { data, error } = await supabaseAdmin
      .from('static_translation_defaults')
      .select('message_key, text_ja, text_en, text_zh')
      .eq('screen_key', 'nav');

    if (error || !Array.isArray(data)) {
      return NextResponse.json({ messages: {} });
    }

    const messages: Record<string, string> = {};

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

      let value: string;
      if (langCode === 'en') {
        value = textEn && textEn !== key ? textEn : '';
      } else if (langCode === 'zh') {
        value = textZh && textZh !== key ? textZh : '';
      } else {
        value = textJa && textJa !== key ? textJa : '';
      }

      messages[key] = value;
    }

    return NextResponse.json({ messages });
  } catch (error) {
    logError('static-translations.nav.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
