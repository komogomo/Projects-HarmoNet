import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logError } from '@/src/lib/logging/log.util';

export type TenantAdminContext = {
  user: User;
  tenantId: string;
  tenantName: string;
};

export async function getTenantAdminContext(): Promise<TenantAdminContext> {
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

  const { data: userTenant, error: utError } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (utError || !userTenant) {
    logError('t-admin.users.no_tenant', { userId: user.id });
    redirect('/login?error=unauthorized');
  }

  const tenantId = userTenant.tenant_id as string;

  const { data: userRoles, error: roleError } = await supabase
    .from('user_roles')
    .select('roles(role_key)')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId);

  const isTenantAdmin =
    !roleError &&
    Array.isArray(userRoles) &&
    userRoles.some((row: any) => (row.roles as any)?.role_key === 'tenant_admin');

  if (!isTenantAdmin) {
    logError('t-admin.users.forbidden', { userId: user.id, tenantId });
    redirect('/home');
  }

  const supabaseAdmin = createSupabaseServiceRoleClient();
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('tenant_name')
    .eq('id', tenantId)
    .single();

  const tenantName = tenant?.tenant_name || '';

  return {
    user,
    tenantId,
    tenantName,
  };
}

export type TenantAdminApiContext = {
  user: User;
  tenantId: string;
  tenantName: string;
  supabase: any;
  supabaseAdmin: any;
};

export class TenantAdminApiError extends Error {
  public readonly status: number;
  public readonly code: 'unauthorized' | 'tenant_not_found' | 'forbidden';

  constructor(status: number, code: 'unauthorized' | 'tenant_not_found' | 'forbidden', message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export async function getTenantAdminApiContext(): Promise<TenantAdminApiContext> {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('t-admin.api.no_session', {
      reason: authError?.message ?? 'no_session',
    });
    throw new TenantAdminApiError(401, 'unauthorized');
  }

  const { data: userTenant, error: utError } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (utError || !userTenant) {
    logError('t-admin.api.no_tenant', { userId: user.id });
    throw new TenantAdminApiError(403, 'tenant_not_found');
  }

  const tenantId = userTenant.tenant_id as string;

  const { data: userRoles, error: roleError } = await supabase
    .from('user_roles')
    .select('roles(role_key)')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId);

  const isTenantAdmin =
    !roleError &&
    Array.isArray(userRoles) &&
    userRoles.some((row: any) => (row.roles as any)?.role_key === 'tenant_admin');

  if (!isTenantAdmin) {
    logError('t-admin.api.forbidden', { userId: user.id, tenantId });
    throw new TenantAdminApiError(403, 'forbidden');
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('tenant_name')
    .eq('id', tenantId)
    .single();

  const tenantName = tenant?.tenant_name || '';

  return {
    user,
    tenantId,
    tenantName,
    supabase,
    supabaseAdmin,
  };
}
