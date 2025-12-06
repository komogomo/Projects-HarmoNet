import React from 'react';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { getSystemAdminContext } from '@/src/lib/auth/systemAdminAuth';
import { logInfo, logError } from '@/src/lib/logging/log.util';
import { SysAdminTenantsConsole } from '@/src/components/sys-admin/SysAdminTenantsConsole/SysAdminTenantsConsole';

type SysAdminTenantsPageMessages = {
  page_title: string;
  tenants_load_error_title: string;
  tenants_load_error_description: string;
};

async function fetchSysAdminTenantsPageMessages(): Promise<SysAdminTenantsPageMessages> {
  const defaultMessages: SysAdminTenantsPageMessages = {
    page_title: 'テナント管理コンソール',
    tenants_load_error_title: 'テナント一覧の取得に失敗しました。',
    tenants_load_error_description: '時間をおいて再度お試しください。',
  };

  try {
    const adminClient = createSupabaseServiceRoleClient();
    const { data, error } = await adminClient
      .from('static_translation_defaults')
      .select('message_key, text_ja')
      .eq('screen_key', 'sys_admin_tenants');

    if (error || !data) {
      return defaultMessages;
    }

    const messages: Partial<SysAdminTenantsPageMessages> = {};

    for (const row of data as { message_key: string; text_ja: string | null }[]) {
      if (row.message_key === 'page_title' && row.text_ja) {
        messages.page_title = row.text_ja;
      } else if (row.message_key === 'tenants_load_error_title' && row.text_ja) {
        messages.tenants_load_error_title = row.text_ja;
      } else if (row.message_key === 'tenants_load_error_description' && row.text_ja) {
        messages.tenants_load_error_description = row.text_ja;
      }
    }

    return {
      page_title: messages.page_title ?? defaultMessages.page_title,
      tenants_load_error_title:
        messages.tenants_load_error_title ?? defaultMessages.tenants_load_error_title,
      tenants_load_error_description:
        messages.tenants_load_error_description ??
        defaultMessages.tenants_load_error_description,
    };
  } catch {
    return defaultMessages;
  }
}

export default async function SysAdminTenantsPage() {
  const { user, adminClient } = await getSystemAdminContext();
  const messages = await fetchSysAdminTenantsPageMessages();

  const { data: tenants, error: tenantsError } = await adminClient
    .from('tenants')
    .select('id, tenant_code, tenant_name, timezone, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (tenantsError) {
    logError('sys-admin.tenants.load_failed', {
      userId: user.id,
      errorMessage: tenantsError.message,
    });
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">
            {messages.tenants_load_error_title}
          </h1>
          <p className="text-sm text-gray-600">
            {messages.tenants_load_error_description}
          </p>
        </div>
      </main>
    );
  }

  logInfo('sys-admin.tenants.page.view', {
    userId: user.id,
    tenantCount: tenants?.length ?? 0,
  });

  return (
    <main className="w-full">
      <div className="pt-4 pb-8 space-y-4">
        <header className="mb-2 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">
            {messages.page_title}
          </h1>
        </header>

        <SysAdminTenantsConsole initialTenants={tenants ?? []} />
      </div>
    </main>
  );
}
