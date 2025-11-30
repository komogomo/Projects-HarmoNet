import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";

async function ensureSystemAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return {
      ok: false as const,
      status: 401,
      message: "Unauthorized",
      adminClient: null as ReturnType<
        typeof createSupabaseServiceRoleClient
      > | null,
    };
  }

  const adminClient = createSupabaseServiceRoleClient();

  const { data: dbUser } = await adminClient
    .from("users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (!dbUser) {
    return {
      ok: false as const,
      status: 403,
      message: "Forbidden",
      adminClient,
    };
  }

  const { data: roles } = await adminClient
    .from("user_roles")
    .select("roles(scope, role_key)")
    .eq("user_id", dbUser.id);

  const isSystemAdmin =
    Array.isArray(roles) &&
    roles.some(
      (row: any) =>
        row.roles?.scope === "system_admin" &&
        row.roles?.role_key === "system_admin",
    );

  if (!isSystemAdmin) {
    return {
      ok: false as const,
      status: 403,
      message: "Forbidden",
      adminClient,
    };
  }

  return {
    ok: true as const,
    status: 200,
    adminClient,
  };
}

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  const auth = await ensureSystemAdmin();

  if (!auth.ok || !auth.adminClient) {
    return NextResponse.json(
      { ok: false, message: auth.message },
      { status: auth.status },
    );
  }
  const adminClient = auth.adminClient;
  const { tenantId } = await context.params;

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json(
      { ok: false, message: '指定されたテナントが見つかりません。' },
      { status: 404 },
    );
  }

  const { data: tenantAdminRole, error: roleError } = await adminClient
    .from('roles')
    .select('id')
    .eq('role_key', 'tenant_admin')
    .maybeSingle();

  if (roleError || !tenantAdminRole) {
    return NextResponse.json(
      { ok: false, message: 'ロールが見つかりません。' },
      { status: 500 },
    );
  }

  const { data: roleRows, error: roleRowsError } = await adminClient
    .from('user_roles')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role_id', tenantAdminRole.id);

  if (roleRowsError) {
    return NextResponse.json(
      { ok: false, message: '管理者一覧の取得に失敗しました。' },
      { status: 500 },
    );
  }

  const userIds = Array.isArray(roleRows)
    ? roleRows.map((row: any) => row.user_id)
    : [];

  if (!userIds.length) {
    return NextResponse.json([]);
  }

  const { data: users, error: usersError } = await adminClient
    .from('users')
    .select('id, email, display_name, full_name')
    .in('id', userIds)
    .order('email', { ascending: true });

  if (usersError) {
    return NextResponse.json(
      { ok: false, message: '管理者一覧の取得に失敗しました。' },
      { status: 500 },
    );
  }

  const result = (users ?? []).map((user: any) => ({
    userId: user.id,
    email: user.email ?? '',
    displayName: user.display_name ?? '',
    fullName: user.full_name ?? '',
    lastLogin: null as string | null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest, context: RouteParams) {
  const auth = await ensureSystemAdmin();

  if (!auth.ok || !auth.adminClient) {
    return NextResponse.json(
      { ok: false, message: auth.message },
      { status: auth.status },
    );
  }

  const adminClient = auth.adminClient;
  const { tenantId } = await context.params;

  let payload: any;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body" },
      { status: 400 },
    );
  }

  const { email, displayName, fullName } = payload ?? {};

  if (!email || !displayName || !fullName) {
    return NextResponse.json(
      { ok: false, message: "入力内容を確認してください。" },
      { status: 400 },
    );
  }

  const { data: tenant } = await adminClient
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json(
      { ok: false, message: "指定されたテナントが見つかりません。" },
      { status: 404 },
    );
  }

  // 1. メールアドレスで users を検索
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id, tenant_id")
    .eq("email", email)
    .maybeSingle();

  let targetUserId: string | null = null;
  let createdNewUser = false;

  if (existingUser) {
    if (existingUser.tenant_id !== tenantId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "このメールアドレスのユーザは別のテナントに所属しているため、管理者として登録できません。",
        },
        { status: 409 },
      );
    }

    targetUserId = existingUser.id;
  } else {
    // 2. Supabase Auth にユーザ作成
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
        },
      });

    if (createError || !newUser?.user) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "管理者ユーザの登録に失敗しました。時間をおいて再度お試しください。",
        },
        { status: 500 },
      );
    }

    targetUserId = newUser.user.id;
    createdNewUser = true;

    // 3. public.users に INSERT（ダミー値を含む）
    const { error: usersError } = await adminClient
      .from("users")
      .upsert({
        id: targetUserId,
        tenant_id: tenantId,
        email,
        display_name: displayName,
        full_name: fullName,
        group_code: "SYSADMIN",
        residence_code: "SYSADMIN",
        language: "ja",
        updated_at: new Date().toISOString(),
      });

    if (usersError) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "管理者ユーザの登録に失敗しました。時間をおいて再度お試しください。",
        },
        { status: 500 },
      );
    }
  }

  if (!targetUserId) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "管理者ユーザの登録に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 500 },
    );
  }

  // 4. tenant_admin ロールを付与
  const { data: tenantAdminRole, error: roleError } = await adminClient
    .from("roles")
    .select("id")
    .eq("role_key", "tenant_admin")
    .maybeSingle();

  if (roleError || !tenantAdminRole) {
    return NextResponse.json(
      { ok: false, message: "ロールが見つかりません。" },
      { status: 500 },
    );
  }

  const { error: userRolesError } = await adminClient
    .from("user_roles")
    .insert({
      user_id: targetUserId,
      tenant_id: tenantId,
      role_id: tenantAdminRole.id,
    });

  if (userRolesError) {
    const isDuplicateKeyError =
      typeof (userRolesError as any).code === "string" &&
      (userRolesError as any).code === "23505";

    if (!isDuplicateKeyError) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "管理者ユーザの登録に失敗しました。時間をおいて再度お試しください。",
        },
        { status: 500 },
      );
    }
  }

  const message = createdNewUser
    ? "管理者ユーザを登録しました。"
    : "既存ユーザをこのテナントの管理者として登録しました。";

  return NextResponse.json({ ok: true, message });
}
