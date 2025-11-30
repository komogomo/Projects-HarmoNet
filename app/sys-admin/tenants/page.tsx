import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { SysAdminTenantsConsole } from '@/src/components/sys-admin/SysAdminTenantsConsole/SysAdminTenantsConsole';

async function requireSystemAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    redirect('/sys-admin/login?error=no_session');
  }

  const adminClient = createSupabaseServiceRoleClient();

  const { data: dbUser } = await adminClient
    .from('users')
    .select('id')
    .eq('email', user!.email)
    .maybeSingle();

  if (!dbUser) {
    return { adminClient, isSystemAdmin: false };
  }

  const { data: roles } = await adminClient
    .from('user_roles')
    .select('roles(scope, role_key)')
    .eq('user_id', dbUser.id);

  const isSystemAdmin = Array.isArray(roles)
    && roles.some(
      (row: any) =>
        row.roles?.scope === 'system_admin'
        && row.roles?.role_key === 'system_admin',
    );

  return { adminClient, isSystemAdmin };
}

export default async function SysAdminTenantsPage() {
  const { adminClient, isSystemAdmin } = await requireSystemAdmin();

  if (!isSystemAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">403 Forbidden</h1>
          <p className="text-sm text-gray-600">このページはシステム管理者専用です。</p>
        </div>
      </main>
    );
  }

  const { data: tenants, error: tenantsError } = await adminClient
    .from('tenants')
    .select('id, tenant_code, tenant_name, timezone, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (tenantsError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">テナント一覧の取得に失敗しました。</h1>
          <p className="text-sm text-gray-600">時間をおいて再度お試しください。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full">
      <div className="pt-4 pb-8 space-y-4">
        <header className="mb-2 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">テナント管理コンソール</h1>
        </header>

        <SysAdminTenantsConsole initialTenants={tenants ?? []} />
      </div>
    </main>
  );
}
