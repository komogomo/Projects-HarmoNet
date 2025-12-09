import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { MagicLinkForm } from '@/src/components/auth/MagicLinkForm/MagicLinkForm';
import { logInfo } from '@/src/lib/logging/log.util';

type SysAdminLoginMessages = {
  page_title: string;
  page_description: string;
  no_permission_message: string;
};

async function fetchSysAdminLoginMessages(): Promise<SysAdminLoginMessages> {
  const defaultMessages: SysAdminLoginMessages = {
    page_title: 'システム管理者ログイン',
    page_description: 'システム管理者専用のテナント管理コンソールへのログイン画面です。',
    no_permission_message: 'このアカウントにはシステム管理者権限がありません。',
  };

  try {
    const adminClient = createSupabaseServiceRoleClient();
    const { data, error } = await adminClient
      .from('static_translation_defaults')
      .select('message_key, text_ja')
      .eq('screen_key', 'sys_admin_login');

    if (error || !data) {
      return defaultMessages;
    }

    const messages: Partial<SysAdminLoginMessages> = {};

    for (const row of data as { message_key: string; text_ja: string | null }[]) {
      if (row.message_key === 'page_title' && row.text_ja) {
        messages.page_title = row.text_ja;
      } else if (row.message_key === 'page_description' && row.text_ja) {
        messages.page_description = row.text_ja;
      } else if (row.message_key === 'no_permission_message' && row.text_ja) {
        messages.no_permission_message = row.text_ja;
      }
    }

    return {
      page_title: messages.page_title ?? defaultMessages.page_title,
      page_description: messages.page_description ?? defaultMessages.page_description,
      no_permission_message: messages.no_permission_message ?? defaultMessages.no_permission_message,
    };
  } catch {
    return defaultMessages;
  }
}

export default async function SysAdminLoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSystemAdmin = false;

  if (user && user.email) {
    const adminClient = createSupabaseServiceRoleClient();

    const { data: dbUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();

    if (dbUser) {
      const { data: roles } = await adminClient
        .from('user_roles')
        .select('roles(scope, role_key)')
        .eq('user_id', dbUser.id);

      if (Array.isArray(roles)) {
        isSystemAdmin = roles.some(
          (row: any) =>
            row.roles?.scope === 'system_admin' &&
            row.roles?.role_key === 'system_admin',
        );
      }
    }

    if (isSystemAdmin) {
      redirect('/sys-admin/tenants');
    }
  }

  const showNoPermissionMessage = !!user && !isSystemAdmin;

  const messages = await fetchSysAdminLoginMessages();

  logInfo('sys-admin.login.page.view', {
    hasSession: !!user,
    isSystemAdmin,
    userId: user?.id ?? null,
  });

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center px-4 pt-28 pb-28">
        <section className="w-full max-w-md text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">{messages.page_title}</h1>
          <p className="text-sm text-gray-500">{messages.page_description}</p>
        </section>

        <section className="w-full max-w-md">
          {showNoPermissionMessage && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
              {messages.no_permission_message}
            </div>
          )}
          <MagicLinkForm
            className="h-full"
            signedInRedirectTo="/sys-admin/login"
          />
        </section>
      </div>
    </main>
  );
}
