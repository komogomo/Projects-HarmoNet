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
      adminClient: null,
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

export async function PUT(request: NextRequest, context: RouteParams) {
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

  const { tenantName, timezone, status } = payload ?? {};

  const updateData: any = {};

  if (typeof tenantName === "string" && tenantName.trim() !== "") {
    updateData.tenant_name = tenantName;
  }
  if (typeof timezone === "string" && timezone.trim() !== "") {
    updateData.timezone = timezone;
  }
  if (status === "active" || status === "inactive") {
    updateData.status = status;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { ok: false, message: "\u66f4\u65b0\u5bfe\u8c61\u306e\u9805\u76ee\u304c\u3042\u308a\u307e\u305b\u3093\u3002" },
      { status: 400 },
    );
  }

  const { error } = await adminClient
    .from("tenants")
    .update(updateData)
    .eq("id", tenantId);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "テナント情報の更新に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
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
  const { tenantId } = await context.params;

  const { error } = await adminClient
    .from("tenants")
    .delete()
    .eq("id", tenantId);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "\u30c6\u30ca\u30f3\u30c8\u306e\u524a\u9664\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u95a2\u9023\u3059\u308b\u30c7\u30fc\u30bf\u304c\u6b8b\u3063\u3066\u3044\u306a\u3044\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
