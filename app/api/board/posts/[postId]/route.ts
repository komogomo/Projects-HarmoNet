import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";
import { getActiveTenantIdsForUser } from "@/src/server/tenant/getActiveTenantIdsForUser";

interface DeletePostRouteContext {
  params?: {
    postId?: string;
  };
}

export async function DELETE(req: Request, context: DeletePostRouteContext) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError("board.post.delete.auth_error", {
        reason: authError?.message ?? "no_session",
      });
      return NextResponse.json({ errorCode: "auth_error" }, { status: 401 });
    }

    const email = user.email;

    // Resolve postId from route params or URL fallback
    let postId = context.params?.postId;
    if (!postId) {
      try {
        const url = new URL(req.url);
        const segments = url.pathname.split("/").filter(Boolean);
        const last = segments[segments.length - 1];
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
      .eq("status", "active")
      .maybeSingle();

    if (appUserError || !appUser) {
      logError("board.post.delete.user_not_found", {
        email,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const tenantIds = await getActiveTenantIdsForUser(supabase, appUser.id);

    if (!tenantIds.length) {
      logError("board.post.delete.membership_error", {
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
      },
    });

    if (!post) {
      return NextResponse.json({ errorCode: "post_not_found" }, { status: 404 });
    }

    const tenantId = post.tenant_id as string;
    const isAuthor = post.author_id === appUser.id;

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

    if (!isAuthor && !hasAdminRole) {
      return NextResponse.json({ errorCode: "forbidden" }, { status: 403 });
    }

    try {
      // Soft delete: archive the post so it no longer appears on the board
      const attachments = await prisma.board_attachments.findMany({
        where: {
          tenant_id: tenantId,
          post_id: postId,
        },
        select: {
          file_url: true,
        },
      });

      if (attachments.length > 0) {
        const serviceRoleSupabase = createSupabaseServiceRoleClient();
        const storageBucket = serviceRoleSupabase.storage.from("board-attachments");
        const paths = attachments
          .map((attachment) => attachment.file_url)
          .filter((path): path is string => typeof path === "string" && path.length > 0);

        if (paths.length > 0) {
          const { error: removeError } = await storageBucket.remove(paths);
          if (removeError) {
            logError("board.post.delete.attachment_remove_failed", {
              tenantId,
              userId: appUser.id,
              postId,
              errorMessage: removeError.message ?? String(removeError),
            });
            return NextResponse.json(
              { errorCode: "attachment_delete_failed" },
              { status: 500 },
            );
          }
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.moderation_logs.deleteMany({
          where: {
            tenant_id: tenantId,
            content_type: "board_post",
            content_id: postId,
          },
        });

        await tx.board_posts.delete({
          where: {
            id: postId,
          },
        });
      });
    } catch (error) {
      logError("board.post.delete.failed", {
        tenantId,
        userId: appUser.id,
        postId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ errorCode: "post_delete_failed" }, { status: 500 });
    }

    logInfo("board.post.delete.success", {
      tenantId,
      userId: appUser.id,
      postId,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logError("board.post.delete.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}
