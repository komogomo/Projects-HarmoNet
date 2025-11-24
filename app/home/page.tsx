import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logInfo, logError } from '@/src/lib/logging/log.util';
import { HomeFooterShortcuts } from '@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts';
import { HomeFeatureTiles } from '@/src/components/home/HomeFeatureTiles/HomeFeatureTiles';
import { HomeBoardNoticeContainer } from '@/src/components/home/HomeNoticeSection/HomeBoardNoticeContainer';
import { clampNoticeCount, DEFAULT_HOME_NOTICE_COUNT } from '@/src/components/home/HomeNoticeSection/HomeNoticeSection.types';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('auth.callback.no_session', {
      reason: authError?.message ?? 'no_session',
      screen: 'Home',
    });
    redirect('/login?error=no_session');
  }

  const email = user.email;

  logInfo('home.debug.auth_user', {
    id: user.id,
    email,
  });

  const {
    data: appUser,
    error: appUserError,
  } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle();

  logInfo('home.debug.app_user_query', {
    email,
    appUser,
    appUserError,
  });

  if (appUserError) {
    logError('auth.callback.db_error', {
      screen: 'Home',
    });
    await supabase.auth.signOut();
    redirect('/login?error=server_error');
  }

  if (!appUser) {
    logError('auth.callback.unauthorized.user_not_found', {
      screen: 'Home',
      email,
    });
    await supabase.auth.signOut();
    redirect('/login?error=unauthorized');
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', appUser.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    logError('auth.callback.db_error', {
      screen: 'Home',
    });
    await supabase.auth.signOut();
    redirect('/login?error=server_error');
  }

  if (!membership || !membership.tenant_id) {
    logError('auth.callback.unauthorized.no_tenant', {
      screen: 'Home',
      userId: appUser.id,
    });
    await supabase.auth.signOut();
    redirect('/login?error=unauthorized');
  }

  const tenantId = membership.tenant_id as string;

  logInfo('auth.callback.authorized', {
    userId: appUser.id,
    tenantId,
  });

  // テナント設定から Home のお知らせ表示件数を取得（将来的に管理画面から変更可能にする想定）。
  const { data: tenantSettingsRows } = await supabase
    .from('tenant_settings')
    .select('config_json')
    .eq('tenant_id', tenantId)
    .limit(1);

  const rawConfigValue = tenantSettingsRows?.[0]?.config_json as unknown;
  let config: any = {};

  if (typeof rawConfigValue === 'string') {
    try {
      config = JSON.parse(rawConfigValue) as any;
    } catch {
      config = {};
    }
  } else if (typeof rawConfigValue === 'object' && rawConfigValue !== null) {
    config = rawConfigValue;
  }

  let homeSection: any = config.home;
  if (typeof homeSection === 'string') {
    try {
      homeSection = JSON.parse(homeSection) as any;
    } catch {
      homeSection = {};
    }
  }

  const rawNoticeConfig = (homeSection?.notice ?? null) as unknown;
  let noticeMaxCountRaw: unknown;

  if (typeof rawNoticeConfig === 'number') {
    noticeMaxCountRaw = rawNoticeConfig;
  } else if (typeof rawNoticeConfig === 'object' && rawNoticeConfig !== null) {
    noticeMaxCountRaw = (rawNoticeConfig as any).maxCount;
  }

  const noticeMaxCount = clampNoticeCount(
    typeof noticeMaxCountRaw === 'number' ? noticeMaxCountRaw : DEFAULT_HOME_NOTICE_COUNT,
  );

  return (
    <>
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-28 pb-28">
          <div className="flex-1 space-y-6">
            <HomeBoardNoticeContainer tenantId={tenantId} maxItems={noticeMaxCount} />
            <HomeFeatureTiles tiles={[]} />
          </div>
        </div>
      </main>
      <HomeFooterShortcuts />
    </>
  );
}
