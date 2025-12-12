import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logError, logInfo, logWarn } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";
import { getActiveTenantIdsForUser } from "@/src/server/tenant/getActiveTenantIdsForUser";

interface ApprovePostRouteContext {
  params?:
    | {
        postId?: string;
      }
    | Promise<{
        postId?: string;
      }>;
}

export async function POST(req: Request, context: ApprovePostRouteContext) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError("board.post.approve.auth_error", {
        reason: authError?.message ?? "no_session",
      });
      return NextResponse.json({ errorCode: "auth_error" }, { status: 401 });
    }

    const email = user.email;

    // Resolve postId from route params or URL fallback
    let postId: string | undefined;

    if (context.params) {
      const params = await context.params;
      postId = params?.postId;
    }

    if (!postId) {
      try {
        const url = new URL(req.url);
        const segments = url.pathname.split("/").filter(Boolean);
        const last = segments[segments.length - 2]; // .../posts/{postId}/approve
        if (last && last !== "posts") {
          postId = last;
        }
      } catch {
        // noop; handled below
      }
    }

    if (!postId) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    const {
      data: appUser,
      error: appUserError,
    } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (appUserError || !appUser) {
      logError("board.post.approve.user_not_found", {
        userId: user.id,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const tenantIds = await getActiveTenantIdsForUser(supabase, appUser.id);

    if (!tenantIds.length) {
      logError("board.post.approve.membership_error", {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const post = await prisma.board_posts.findFirst({
      where: {
        id: postId,
        tenant_id: { in: tenantIds },
      },
      select: {
        id: true,
        tenant_id: true,
        author_id: true,
        author_role: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json({ errorCode: "post_not_found" }, { status: 404 });
    }

    const tenantId = post.tenant_id as string;

    if (post.author_id === appUser.id) {
      logWarn("board.post.approve.forbidden_self_approval", {
        tenantId,
        postId,
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: "self_approval_forbidden" }, { status: 403 });
    }

    let hasAdminRole = false;
    try {
      const {
        data: userRoles,
        error: userRolesError,
      } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", appUser.id)
        .eq("tenant_id", tenantId);

      if (!userRolesError && userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
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
            hasAdminRole = roles.some(
              (role: any) =>
                role.role_key === "tenant_admin" || role.role_key === "system_admin",
            );
          }
        }
      }
    } catch {
      hasAdminRole = false;
    }

    if (!hasAdminRole) {
      return NextResponse.json({ errorCode: "forbidden" }, { status: 403 });
    }

    const rawAuthorRole = (post as any).author_role as string | null;
    const rawStatus = (post as any).status as string | null;

    if (rawAuthorRole !== "management" || rawStatus !== "pending") {
      return NextResponse.json({ errorCode: "invalid_state" }, { status: 400 });
    }

    // すでに承認済みであれば重複行を作らない（count(distinct approver) のため必須ではないがログを抑制）
    const existing = await prisma.board_approval_logs.findFirst({
      where: {
        tenant_id: tenantId,
        post_id: postId,
        approver_id: appUser.id,
        action: "approve",
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      await prisma.board_approval_logs.create({
        data: {
          tenant_id: tenantId,
          post_id: postId,
          approver_id: appUser.id,
          action: "approve",
          comment: "", // 現WSではコメント入力UIなしのため空文字で登録
        },
      });
    }

    const approvals = await prisma.board_approval_logs.findMany({
      where: {
        tenant_id: tenantId,
        post_id: postId,
        action: "approve",
      },
      select: {
        approver_id: true,
      },
    });

    const uniqueApproverIds = Array.from(
      new Set(
        approvals
          .map((row) => row.approver_id)
          .filter((id): id is string => typeof id === "string"),
      ),
    );

    const approvalCount = uniqueApproverIds.length;
    const hasApprovedByCurrentUser = uniqueApproverIds.includes(appUser.id as string);

    logInfo("board.post.approve.success", {
      tenantId,
      postId,
      userId: appUser.id,
      approvalCount,
    });

    return NextResponse.json(
      { ok: true, approvalCount, hasApprovedByCurrentUser },
      { status: 200 },
    );
  } catch (error) {
    logError("board.post.approve.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}
