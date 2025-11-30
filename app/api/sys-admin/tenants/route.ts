import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { randomUUID } from "crypto";

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

export async function POST(request: NextRequest) {
  const auth = await ensureSystemAdmin();

  if (!auth.ok || !auth.adminClient) {
    return NextResponse.json(
      { ok: false, message: auth.message },
      { status: auth.status },
    );
  }

  const adminClient = auth.adminClient;

  let payload: any;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body" },
      { status: 400 },
    );
  }

  const { tenantCode, tenantName, timezone } = payload ?? {};

  if (!tenantCode || !tenantName || !timezone) {
    return NextResponse.json(
      { ok: false, message: "必須項目が不足しています。" },
      { status: 400 },
    );
  }

  const newTenantId = randomUUID();
  const nowIso = new Date().toISOString();

  const { data: existing } = await adminClient
    .from("tenants")
    .select("id")
    .eq("tenant_code", tenantCode)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { ok: false, message: "このテナントコードは既に使用されています。" },
      { status: 409 },
    );
  }

  const { data, error } = await adminClient
    .from("tenants")
    .insert({
      id: newTenantId,
      tenant_code: tenantCode,
      tenant_name: tenantName,
      timezone,
      created_at: nowIso,
      updated_at: nowIso,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error) {
      console.error("Create tenant error:", error);
    }
    return NextResponse.json(
      {
        ok: false,
        message:
          "テナントの登録に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, tenantId: data.id });
}
