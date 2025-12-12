import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/src/lib/logging/log.util';

export async function updateSession(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isSysAdminPath = path.startsWith('/sys-admin') && !path.startsWith('/sys-admin/login');
  const isTenantAdminPath = path.startsWith('/t-admin');

  if (isSysAdminPath) {
    const isSessionMissingError =
      !!authError && authError.message === 'Auth session missing!';

    if (authError && !isSessionMissingError) {
      logError('sys-admin.middleware.no_session', {
        reason: authError.message,
        path,
      });

      const sysAdminLoginUrl = new URL('/sys-admin/login', request.url);
      return NextResponse.redirect(sysAdminLoginUrl);
    }

    if (!user || isSessionMissingError) {
      const sysAdminLoginUrl = new URL('/sys-admin/login', request.url);
      return NextResponse.redirect(sysAdminLoginUrl);
    }

    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('roles(scope, role_key)')
      .eq('user_id', user.id);

    const isSystemAdmin =
      !roleError &&
      Array.isArray(roles) &&
      roles.some(
        (row: any) =>
          row.roles?.scope === 'system_admin' &&
          row.roles?.role_key === 'system_admin',
      );

    if (!isSystemAdmin) {
      logError('sys-admin.middleware.forbidden', {
        userId: user.id,
        path,
      });

      const sysAdminLoginUrl = new URL('/sys-admin/login', request.url);
      sysAdminLoginUrl.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(sysAdminLoginUrl);
    }

    return response;
  }

  if (isTenantAdminPath) {
    const isSessionMissingError =
      !!authError && authError.message === 'Auth session missing!';

    if (authError && !isSessionMissingError) {
      // 予期せぬ認証エラーのみ ERROR としてログに残す
      logError('t-admin.middleware.no_session', {
        reason: authError.message,
        path,
      });

      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (!user || isSessionMissingError) {
      // 単なる未ログインや Auth session missing! は想定内のためログを出さずに /login へ
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('roles(role_key)')
      .eq('user_id', user.id);

    const isTenantAdmin =
      !roleError &&
      Array.isArray(userRoles) &&
      userRoles.some((row: any) => (row.roles as any)?.role_key === 'tenant_admin');

    if (!isTenantAdmin) {
      logError('t-admin.middleware.forbidden', {
        userId: user.id,
        path,
      });

      const homeUrl = new URL('/home', request.url);
      return NextResponse.redirect(homeUrl);
    }

    return response;
  }

  return response;
}
