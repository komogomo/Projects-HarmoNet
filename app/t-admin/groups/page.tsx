import React from 'react';
import { getTenantAdminContext } from '@/src/lib/auth/tenantAdminAuth';
import { logInfo } from '@/src/lib/logging/log.util';
import { TenantGroupMasterManagement } from '@/src/components/t-admin/TenantGroupMasterManagement/TenantGroupMasterManagement';

export default async function TenantAdminGroupsPage() {
  const { tenantId, tenantName } = await getTenantAdminContext();

  logInfo('t-admin.groups.page.view', {
    tenantId,
    tenantName,
  });

  return <TenantGroupMasterManagement tenantId={tenantId} tenantName={tenantName} />;
}
