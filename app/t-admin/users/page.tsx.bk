import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logError } from '@/src/lib/logging/log.util';
import { TenantAdminUserManagement } from '@/src/components/t-admin/TenantAdminUserManagement';

export default async function TenantAdminUsersPage() {
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
        logError('t-admin.users.no_session', {
            reason: authError?.message ?? 'no_session',
        });
        redirect('/login?error=no_session');
    }

    // Get tenant_id
    const { data: userTenant, error: utError } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

    if (utError || !userTenant) {
        logError('t-admin.users.no_tenant', { userId: user.id });
        redirect('/login?error=unauthorized');
    }

    const tenantId = userTenant.tenant_id;

    // Check if user is tenant_admin (allow multiple roles per tenant)
    const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('roles(role_key)')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId);

    const isTenantAdmin =
        !roleError
        && Array.isArray(userRoles)
        && userRoles.some(
            (row: any) => (row.roles as any)?.role_key === 'tenant_admin',
        );

    if (!isTenantAdmin) {
        logError('t-admin.users.forbidden', { userId: user.id, tenantId });
        redirect('/home');
    }

    // Fetch tenant name using admin client to bypass RLS
    const supabaseAdmin = createSupabaseServiceRoleClient();
    const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('tenant_name')
        .eq('id', tenantId)
        .single();

    const tenantName = tenant?.tenant_name || '';

    return <TenantAdminUserManagement tenantId={tenantId} tenantName={tenantName} />;
}
