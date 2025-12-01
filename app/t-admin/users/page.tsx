import React from 'react';
import { getTenantAdminContext } from '@/src/lib/auth/tenantAdminAuth';
import { TenantAdminUserManagement } from '@/src/components/t-admin/TenantAdminUserManagement';

export default async function TenantAdminUsersPage() {
    const { tenantId, tenantName } = await getTenantAdminContext();

    return <TenantAdminUserManagement tenantId={tenantId} tenantName={tenantName} />;
}
