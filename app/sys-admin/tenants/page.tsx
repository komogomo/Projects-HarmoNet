import React from 'react';
import { getSystemAdminContext } from '@/src/lib/auth/systemAdminAuth';
import { SysAdminTenantsConsole } from '@/src/components/sys-admin/SysAdminTenantsConsole/SysAdminTenantsConsole';

export default async function SysAdminTenantsPage() {
  const { adminClient } = await getSystemAdminContext();

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
