import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logInfo, logError } from '@/src/lib/logging/log.util';
import { HomeFooterShortcuts } from '@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts';
import { HomeNoticeSection } from '@/src/components/home/HomeNoticeSection/HomeNoticeSection';
import type { HomeNoticeItem } from '@/src/components/home/HomeNoticeSection/HomeNoticeSection.types';
import { HomeFeatureTiles } from '@/src/components/home/HomeFeatureTiles/HomeFeatureTiles';

const MOCK_HOME_NOTICE_ITEMS: HomeNoticeItem[] = [
  {
    id: 'notice-1',
    title: '共用部分清掃のお知らせ（11/25 実施）',
    publishedAt: '2025/11/20 10:00:00',
  },
  {
    id: 'notice-2',
    title: 'エレベーター点検のお知らせ（12/05 実施）',
    publishedAt: '2025/11/18 09:30:00',
  },
];

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

  logInfo('auth.callback.authorized', {
    userId: appUser.id,
    tenantId: membership.tenant_id,
  });

  const noticeItems: HomeNoticeItem[] = MOCK_HOME_NOTICE_ITEMS;

  return (
    <>
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-28 pb-28">
          <div className="flex-1 space-y-6">
            <HomeNoticeSection items={noticeItems} maxItems={2} />
            <HomeFeatureTiles tiles={[]} />
          </div>
        </div>
      </main>
      <HomeFooterShortcuts />
    </>
  );
}
