import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { SysAdminLoginClient } from '@/src/components/sys-admin/SysAdminLoginClient/SysAdminLoginClient';
import { logInfo } from '@/src/lib/logging/log.util';

export default async function SysAdminLoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSystemAdmin = false;

  if (user && user.email) {
    const adminClient = createSupabaseServiceRoleClient();

    const { data: dbUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();

    if (dbUser) {
      const { data: roles } = await adminClient
        .from('user_roles')
        .select('roles(scope, role_key)')
        .eq('user_id', dbUser.id);

      if (Array.isArray(roles)) {
        isSystemAdmin = roles.some(
          (row: any) =>
            row.roles?.scope === 'system_admin' &&
            row.roles?.role_key === 'system_admin',
        );
      }
    }

    if (isSystemAdmin) {
      redirect('/sys-admin/tenants');
    }
  }

  const showNoPermissionMessage = !!user && !isSystemAdmin;

  logInfo('sys-admin.login.page.view', {
    hasSession: !!user,
    isSystemAdmin,
    userId: user?.id ?? null,
  });

  return (
    <SysAdminLoginClient
      hasSession={!!user}
      showNoPermissionMessage={showNoPermissionMessage}
      redirectTo="/auth/callback?next=/sys-admin/tenants"
      signedInRedirectTo="/sys-admin/login"
    />
  );
}
