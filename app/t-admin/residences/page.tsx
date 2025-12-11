import React from 'react';
import { getTenantAdminContext } from '@/src/lib/auth/tenantAdminAuth';
import { logInfo } from '@/src/lib/logging/log.util';
import { TenantResidenceMasterManagement } from '@/src/components/t-admin/TenantResidenceMasterManagement/TenantResidenceMasterManagement';

export default async function TenantAdminResidencesPage() {
  const { tenantId, tenantName } = await getTenantAdminContext();

  logInfo('t-admin.residences.page.view', {
    tenantId,
    tenantName,
  });

  return <TenantResidenceMasterManagement tenantId={tenantId} tenantName={tenantName} />;
}
