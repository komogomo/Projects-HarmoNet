import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import CleaningDutyPage from '@/src/components/cleaning-duty/CleaningDutyPage';
import { HomeFooterShortcuts } from '@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts';

export default async function CleaningDutyRoute() {
  logInfo('cleaningDuty.page.enter');

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError('auth.callback.no_session', {
      reason: authError?.message ?? 'no_session',
      screen: 'CleaningDuty',
    });
    redirect('/login?error=no_session');
  }

  const email = user.email;

  const {
    data: appUser,
    error: appUserError,
  } = await supabase
    .from('users')
    .select('id, group_code, residence_code')
    .eq('email', email)
    .maybeSingle();

  if (appUserError) {
    logError('auth.callback.db_error', {
      screen: 'CleaningDuty',
    });
    await supabase.auth.signOut();
    redirect('/login?error=server_error');
  }

  if (!appUser) {
    logError('auth.callback.unauthorized.user_not_found', {
      screen: 'CleaningDuty',
      email,
    });
    await supabase.auth.signOut();
    redirect('/login?error=unauthorized');
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', appUser.id)
    .maybeSingle();

  if (membershipError) {
    logError('auth.callback.db_error', {
      screen: 'CleaningDuty',
    });
    await supabase.auth.signOut();
    redirect('/login?error=server_error');
  }

  if (!membership || !membership.tenant_id) {
    logError('auth.callback.unauthorized.no_tenant', {
      screen: 'CleaningDuty',
      userId: appUser.id,
    });
    await supabase.auth.signOut();
    redirect('/login?error=unauthorized');
  }

  const tenantId = membership.tenant_id as string;

  let tenantName = '';
  try {
    const supabaseAdmin = createSupabaseServiceRoleClient();
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('tenant_name')
      .eq('id', tenantId)
      .single();

    if (tenant?.tenant_name) {
      tenantName = tenant.tenant_name as string;
    }
  } catch {
    // テナント名取得に失敗しても画面表示は続行する
  }

  let isGroupLeader = false;

  try {
    const {
      data: userRoles,
      error: userRolesError,
    } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', appUser.id)
      .eq('tenant_id', tenantId);

    if (!userRolesError && userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
      const roleIds = userRoles
        .map((row: any) => row.role_id)
        .filter((id: unknown): id is string => typeof id === 'string');

      if (roleIds.length > 0) {
        const {
          data: roles,
          error: rolesError,
        } = await supabase
          .from('roles')
          .select('id, role_key')
          .in('id', roleIds as string[]);

        if (!rolesError && roles && Array.isArray(roles)) {
          isGroupLeader = roles.some((role: any) => role.role_key === 'group_leader');
        }
      }
    }
  } catch {
    isGroupLeader = false;
  }

  const groupCode = (appUser as any).group_code as string | null;
  const residenceCode = (appUser as any).residence_code as string | null;

  logInfo('cleaningDuty.page.context_resolved', {
    userId: appUser.id,
    tenantId,
    groupCode: groupCode ?? null,
    isGroupLeader,
  });

  logInfo('cleaningDuty.page.view', {
    tenantId,
    userId: appUser.id,
    groupCode: groupCode ?? null,
    route: '/cleaning-duty',
  });

  return (
    <>
      <CleaningDutyPage
        tenantId={tenantId}
        tenantName={tenantName}
        userId={appUser.id as string}
        groupCode={groupCode ?? null}
        residenceCode={residenceCode ?? null}
        isGroupLeader={isGroupLeader}
      />
      <HomeFooterShortcuts />
    </>
  );
}
