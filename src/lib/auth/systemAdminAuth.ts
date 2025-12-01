import { redirect } from 'next/navigation';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logError } from '@/src/lib/logging/log.util';

export type SystemAdminContext = {
  user: User;
  adminClient: SupabaseClient;
};

export async function getSystemAdminContext(): Promise<SystemAdminContext> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('sys-admin.context.no_session', {
      reason: authError?.message ?? 'no_session',
    });
    redirect('/sys-admin/login');
  }

  const adminClient = createSupabaseServiceRoleClient() as SupabaseClient;

  const { data: dbUser } = await adminClient
    .from('users')
    .select('id')
    .eq('email', user!.email)
    .maybeSingle();

  if (!dbUser) {
    logError('sys-admin.context.no_user', {
      email: user.email,
    });
    redirect('/sys-admin/login');
  }

  const { data: roles } = await adminClient
    .from('user_roles')
    .select('roles(scope, role_key)')
    .eq('user_id', dbUser.id);

  const isSystemAdmin =
    Array.isArray(roles) &&
    roles.some(
      (row: any) =>
        row.roles?.scope === 'system_admin' &&
        row.roles?.role_key === 'system_admin',
    );

  if (!isSystemAdmin) {
    logError('sys-admin.context.forbidden', {
      userId: dbUser.id,
    });
    redirect('/sys-admin/login');
  }

  return {
    user,
    adminClient,
  };
}

export type SystemAdminApiContext = {
  user: User;
  adminClient: SupabaseClient;
};

export class SystemAdminApiError extends Error {
  public readonly status: number;
  public readonly code: 'unauthorized' | 'forbidden';

  constructor(status: number, code: 'unauthorized' | 'forbidden', message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export async function getSystemAdminApiContext(): Promise<SystemAdminApiContext> {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseServiceRoleClient() as SupabaseClient;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('sys-admin.api.no_session', {
      reason: authError?.message ?? 'no_session',
    });
    throw new SystemAdminApiError(401, 'unauthorized');
  }

  const { data: dbUser } = await adminClient
    .from('users')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  if (!dbUser) {
    logError('sys-admin.api.no_user', {
      email: user.email,
    });
    throw new SystemAdminApiError(403, 'forbidden');
  }

  const { data: roles } = await adminClient
    .from('user_roles')
    .select('roles(scope, role_key)')
    .eq('user_id', dbUser.id);

  const isSystemAdmin =
    Array.isArray(roles) &&
    roles.some(
      (row: any) =>
        row.roles?.scope === 'system_admin' &&
        row.roles?.role_key === 'system_admin',
    );

  if (!isSystemAdmin) {
    logError('sys-admin.api.forbidden', {
      userId: dbUser.id,
    });
    throw new SystemAdminApiError(403, 'forbidden');
  }

  return {
    user,
    adminClient,
  };
}
