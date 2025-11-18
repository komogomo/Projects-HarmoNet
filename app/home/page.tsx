import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logInfo, logError } from '@/src/lib/logging/log.util';

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

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900">Home</h1>
        <p className="mt-2 text-sm text-gray-600">
          認証後のホーム画面プレースホルダです。詳細な UI は別タスクで実装されます。
        </p>
      </div>
    </main>
  );
}
