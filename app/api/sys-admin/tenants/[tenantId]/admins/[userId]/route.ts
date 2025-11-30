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
    userId: string;
  }>;
}

export async function PUT(request: NextRequest, context: RouteParams) {
  const auth = await ensureSystemAdmin();

  if (!auth.ok || !auth.adminClient) {
    return NextResponse.json(
      { ok: false, message: auth.message },
      { status: auth.status },
    );
  }
  const adminClient = auth.adminClient;
  const { tenantId, userId } = await context.params;

  let payload: any;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body" },
      { status: 400 },
    );
  }

  const { displayName, fullName } = payload ?? {};

  if (!displayName || !fullName) {
    return NextResponse.json(
      { ok: false, message: "入力内容を確認してください。" },
      { status: 400 },
    );
  }

  const { data: user } = await adminClient
    .from("users")
    .select("id, tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (!user || user.tenant_id !== tenantId) {
    return NextResponse.json(
      {
        ok: false,
        message: "このユーザを操作する権限がありません。",
      },
      { status: 403 },
    );
  }

  const { error: updateError } = await adminClient
    .from("users")
    .update({
      display_name: displayName,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("tenant_id", tenantId);

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "管理者ユーザの更新に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "管理者ユーザを更新しました。",
  });
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const auth = await ensureSystemAdmin();

  if (!auth.ok || !auth.adminClient) {
    return NextResponse.json(
      { ok: false, message: auth.message },
      { status: auth.status },
    );
  }

  const adminClient = auth.adminClient;
  const { tenantId, userId } = await context.params;

  const { data: user } = await adminClient
    .from("users")
    .select("id, tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (!user || user.tenant_id !== tenantId) {
    return NextResponse.json(
      {
        ok: false,
        message: "このユーザを操作する権限がありません。",
      },
      { status: 403 },
    );
  }

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

  const { error: deleteError } = await adminClient
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("role_id", tenantAdminRole.id);

  if (deleteError) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "管理者ロールの解除に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "管理者ユーザを削除しました。（一般ユーザとしての情報は残ります）",
  });
}
