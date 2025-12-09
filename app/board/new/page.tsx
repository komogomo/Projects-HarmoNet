import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";
import BoardPostForm from "@/src/components/board/BoardPostForm/BoardPostForm";

type BoardNewPageProps = {
  searchParams?: Promise<{
    replyTo?: string;
  }>;
};

export default async function BoardNewPage(props: BoardNewPageProps) {
  logInfo("board.post.form.enter");

  const resolvedSearchParams = props.searchParams
    ? await props.searchParams
    : undefined;

  const replyTo = resolvedSearchParams?.replyTo;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError("auth.callback.no_session", {
      reason: authError?.message ?? "no_session",
      screen: "BoardNew",
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
      screen: "BoardNew",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!appUser) {
    logError("auth.callback.unauthorized.user_not_found", {
      screen: "BoardNew",
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
      screen: "BoardNew",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!membership || !membership.tenant_id) {
    logError("auth.callback.unauthorized.no_tenant", {
      screen: "BoardNew",
      userId: appUser.id,
    });
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  const tenantId = membership.tenant_id as string;

  logInfo("board.post.form.membership_resolved", {
    userId: appUser.id,
    tenantId,
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

  const {
    data: userRoles,
    error: userRolesError,
  } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", appUser.id)
    .eq("tenant_id", tenantId);

  let viewerRole: "admin" | "user" = "user";

  logInfo("board.post.form.user_roles_result", {
    userId: appUser.id,
    tenantId,
    userRoles,
    userRolesError,
  });

  if (!userRolesError && userRoles && userRoles.length > 0) {
    const roleIds = userRoles
      .map((row: any) => row.role_id)
      .filter((id: unknown): id is string => typeof id === "string");

    if (roleIds.length > 0) {
      const {
        data: roles,
        error: rolesError,
      } = await supabase
        .from("roles")
        .select("id, role_key")
        .in("id", roleIds as string[]);

      if (!rolesError && roles && Array.isArray(roles)) {
        logInfo("board.post.form.roles_debug", {
          userId: appUser.id,
          tenantId,
          roleIds,
          roles,
          rolesError,
        });

        const hasAdmin = roles.some(
          (role: any) =>
            role.role_key === "tenant_admin" || role.role_key === "system_admin",
        );
        if (hasAdmin) {
          viewerRole = "admin";
        }
      }
    }
  }

  const isManagementMember = viewerRole === "admin";

  logInfo("board.post.form_context", {
    userId: appUser.id,
    tenantId,
    viewerRole,
    isManagementMember,
  });

  const supabaseAdminForCategories = createSupabaseServiceRoleClient();

  const {
    data: rawCategories,
    error: categoryError,
  } = await supabaseAdminForCategories
    .from("board_categories")
    .select("tenant_id, category_key, category_name, display_order, status")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("display_order", { ascending: true });

  const categories = rawCategories ?? [];

  logInfo("board.post.form.categories_fetched", {
    tenantId,
    hasError: !!categoryError,
    errorMessage: categoryError?.message ?? null,
    rawLength: rawCategories?.length ?? 0,
    filteredLength: categories.length,
  });

  if (categoryError || categories.length === 0) {
    logError("board.post.form.category_error", {
      tenantId,
      hasError: !!categoryError,
      errorMessage: categoryError?.message ?? null,
      rawLength: rawCategories?.length ?? 0,
      filteredLength: categories.length,
    });
    redirect("/home");
  }

  const categoryOptions = categories.map((category: any) => ({
    key: category.category_key as string,
    label: category.category_name as string,
  }));

  return (
    <>
      <main className="min-h-screen bg-white pb-24">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
          <div className="flex-1 space-y-6">
            {tenantName && (
              <div className="mb-1 flex justify-center">
                <p className="max-w-full truncate text-base font-medium text-gray-600">
                  {tenantName}
                </p>
              </div>
            )}
            <BoardPostForm
              tenantId={tenantId}
              viewerUserId={appUser.id}
              viewerRole={viewerRole}
              isManagementMember={isManagementMember}
              categories={categoryOptions}
              mode={replyTo ? "reply" : "create"}
              replyToPostId={replyTo}
            />
          </div>
        </div>
      </main>
      <HomeFooterShortcuts />
    </>
  );
}
