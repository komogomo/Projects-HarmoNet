import React from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { getBoardPostById } from "@/src/server/board/getBoardPostById";
import BoardDetailPage from "@/src/components/board/BoardDetail/BoardDetailPage";

interface BoardDetailRouteProps {
  params: Promise<{
    postId: string;
  }>;
}

export default async function BoardDetailRoute(props: BoardDetailRouteProps) {
  const { params } = props;
  const { postId } = await params;

  if (!postId) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError("auth.callback.no_session", {
      reason: authError?.message ?? "no_session",
      screen: "BoardDetail",
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
      screen: "BoardDetail",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!appUser) {
    logError("auth.callback.unauthorized.user_not_found", {
      screen: "BoardDetail",
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
      screen: "BoardDetail",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!membership || !membership.tenant_id) {
    logError("auth.callback.unauthorized.no_tenant", {
      screen: "BoardDetail",
      userId: appUser.id,
    });
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  const tenantId = membership.tenant_id as string;

  logInfo("board.detail.context_resolved", {
    userId: appUser.id,
    tenantId,
    postId,
  });

  // テナント名の取得（ServiceRole 経由）
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

  const post = await getBoardPostById({
    tenantId,
    postId,
    currentUserId: appUser.id,
  });

  if (!post) {
    notFound();
  }

  return <BoardDetailPage data={post} tenantName={tenantName} />;
}
