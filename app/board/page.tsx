import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import BoardTopPage from "@/src/components/board/BoardTop/BoardTopPage";

export default async function BoardPage() {
  logInfo("board.top.enter");

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError("auth.callback.no_session", {
      reason: authError?.message ?? "no_session",
      screen: "BoardTop",
    });
    redirect("/login?error=no_session");
  }

  const email = user.email;

  const {
    data: appUser,
    error: appUserError,
  } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (appUserError) {
    logError("auth.callback.db_error", {
      screen: "BoardTop",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!appUser) {
    logError("auth.callback.unauthorized.user_not_found", {
      screen: "BoardTop",
      email,
    });
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (membershipError) {
    logError("auth.callback.db_error", {
      screen: "BoardTop",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!membership || !membership.tenant_id) {
    logError("auth.callback.unauthorized.no_tenant", {
      screen: "BoardTop",
      userId: appUser.id,
    });
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  const tenantId = membership.tenant_id as string;

  logInfo("board.top.context_resolved", {
    userId: appUser.id,
    tenantId,
  });

  let tenantName = "";
  try {
    const supabaseAdmin = createSupabaseServiceRoleClient();
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("tenant_name")
      .eq("id", tenantId)
      .single();

    if (tenant?.tenant_name) {
      tenantName = tenant.tenant_name as string;
    }
  } catch {
    // テナント名取得に失敗しても画面表示は続行する
  }

  return <BoardTopPage tenantId={tenantId} tenantName={tenantName} />;
}
