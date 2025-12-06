import React from 'react';
import { getTenantAdminContext } from '@/src/lib/auth/tenantAdminAuth';
import { logInfo } from '@/src/lib/logging/log.util';
import { TenantAdminUserManagement } from '@/src/components/t-admin/TenantAdminUserManagement';

export default async function TenantAdminUsersPage() {
    const { tenantId, tenantName } = await getTenantAdminContext();

    logInfo('t-admin.users.page.view', {
        tenantId,
        tenantName,
    });

    return <TenantAdminUserManagement tenantId={tenantId} tenantName={tenantName} />;
}
