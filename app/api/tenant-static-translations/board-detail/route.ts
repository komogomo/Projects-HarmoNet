import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { TenantStaticTranslationService } from '@/src/server/services/translation/TenantStaticTranslationService';
import { logError } from '@/src/lib/logging/log.util';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');
    const lang = url.searchParams.get('lang');

    if (!tenantId) {
      return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
    }

    if (lang !== 'ja' && lang !== 'en' && lang !== 'zh') {
      return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
    }

    const langCode = lang;

    const supabaseAdmin = createSupabaseServiceRoleClient();
    const service = new TenantStaticTranslationService({ supabase: supabaseAdmin });

    const screenKey = 'board_detail';

    const allMessages = await service.getMessagesForScreen({
      tenantId,
      screenKey,
    });

    const messages =
      langCode === 'en' ? allMessages.en : langCode === 'zh' ? allMessages.zh : allMessages.ja;

    return NextResponse.json({ screenKey, lang: langCode, messages });
  } catch (error) {
    logError('i18n.tenant_static_translations.board_detail.unexpected', {
      route: 'tenant-static-translations/board-detail',
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
