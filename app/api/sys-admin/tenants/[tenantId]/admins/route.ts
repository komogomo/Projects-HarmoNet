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
      console.error("Error creating user in Supabase Auth:", createError);
      return NextResponse.json(
        {
          ok: false,
          message: `管理者ユーザの作成に失敗しました(Auth): ${createError?.message ?? "Unknown error"}`,
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
      console.error("Error upserting user in public.users:", usersError);
      return NextResponse.json(
        {
          ok: false,
          message: `管理者ユーザの作成に失敗しました(DB): ${usersError.message}`,
        },
        { status: 500 },
      );
    }
  }

  if (!targetUserId) {
    return NextResponse.json(
      {
        ok: false,
        message: "管理者ユーザのID取得に失敗しました。",
      },
      { status: 500 },
    );
  }

  // 3.5. user_tenants に登録 (ログイン時の所属確認に必要)
  const { error: userTenantsError } = await adminClient
    .from("user_tenants")
    .upsert(
      {
        user_id: targetUserId,
        tenant_id: tenantId,
      },
      { onConflict: "user_id, tenant_id" }
    );

  if (userTenantsError) {
    console.error("Error upserting user_tenants:", userTenantsError);
    return NextResponse.json(
      {
        ok: false,
        message: `所属情報の作成に失敗しました: ${userTenantsError.message}`,
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
    console.error("Error fetching tenant_admin role:", roleError);
    return NextResponse.json(
      { ok: false, message: "ロール(tenant_admin)が見つかりません。" },
      { status: 500 },
    );
  }

  // 4.1. general_user ロールも取得 (テナント管理者は一般ユーザ機能も利用するため)
  const { data: generalUserRole, error: generalRoleError } = await adminClient
    .from("roles")
    .select("id")
    .eq("role_key", "general_user")
    .maybeSingle();

  if (generalRoleError || !generalUserRole) {
    console.error("Error fetching general_user role:", generalRoleError);
    return NextResponse.json(
      { ok: false, message: "ロール(general_user)が見つかりません。" },
      { status: 500 },
    );
  }

  // ロール付与 (tenant_admin と general_user)
  const rolesToInsert = [
    {
      user_id: targetUserId,
      tenant_id: tenantId,
      role_id: tenantAdminRole.id,
    },
    {
      user_id: targetUserId,
      tenant_id: tenantId,
      role_id: generalUserRole.id,
    },
  ];

  // Use upsert instead of insert to handle duplicates gracefully
  const { error: userRolesError } = await adminClient
    .from("user_roles")
    .upsert(rolesToInsert, { onConflict: "user_id, tenant_id, role_id" });

  if (userRolesError) {
    console.error("Error upserting user_roles:", userRolesError);
    return NextResponse.json(
      {
        ok: false,
        message: `ロールの付与に失敗しました: ${userRolesError.message}`,
      },
      { status: 500 },
    );
  }

  const message = createdNewUser
    ? "管理者ユーザを登録しました。"
    : "既存ユーザをこのテナントの管理者として登録しました。";

  return NextResponse.json({ ok: true, message });
}
