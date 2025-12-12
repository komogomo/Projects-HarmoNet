import React from 'react';
import { getSystemAdminContext } from '@/src/lib/auth/systemAdminAuth';
import { logInfo, logError } from '@/src/lib/logging/log.util';
import { SysAdminTenantsPageClient } from '@/src/components/sys-admin/SysAdminTenantsPageClient/SysAdminTenantsPageClient';

export default async function SysAdminTenantsPage() {
  const { user, adminClient } = await getSystemAdminContext();

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
    return <SysAdminTenantsPageClient initialTenants={[]} hasLoadError={true} />;
  }

  logInfo('sys-admin.tenants.page.view', {
    userId: user.id,
    tenantCount: tenants?.length ?? 0,
  });

  return <SysAdminTenantsPageClient initialTenants={tenants ?? []} hasLoadError={false} />;
}
