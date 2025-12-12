import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { TenantStaticTranslationService } from '@/src/server/services/translation/TenantStaticTranslationService';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');
    const lang = url.searchParams.get('lang');

    if (!tenantId) {
      return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
    }

    const langCode = lang === 'en' || lang === 'zh' ? lang : 'ja';

    const supabaseAdmin = createSupabaseServiceRoleClient();
    const service = new TenantStaticTranslationService({ supabase: supabaseAdmin });

    const allMessages = await service.getMessagesForScreen({
      tenantId,
      screenKey: 'cleaning_duty',
    });

    const messages =
      langCode === 'en' ? allMessages.en : langCode === 'zh' ? allMessages.zh : allMessages.ja;

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[tenant-static-translations][cleaning-duty] Unexpected error', error);
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
