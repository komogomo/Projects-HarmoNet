import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";
import { getActiveTenantIdsForUser } from "@/src/server/tenant/getActiveTenantIdsForUser";

interface DeleteCommentRouteContext {
  params?: {
    commentId?: string;
  };
}

export async function DELETE(req: Request, context: DeleteCommentRouteContext) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError("board.comments.api.auth_error", {
        reason: authError?.message ?? "no_session",
      });
      return NextResponse.json({ errorCode: "auth_error" }, { status: 401 });
    }

    const email = user.email;

    let commentId = context.params?.commentId;
    if (!commentId) {
      // App Router の params 解決に失敗した場合に備え、URL パスから commentId を再取得するフォールバック
      try {
        const url = new URL(req.url);
        const segments = url.pathname.split("/").filter(Boolean);
        const last = segments[segments.length - 1];
        if (last && last !== "comments") {
          commentId = last;
        }
      } catch {
        // noop: 下で validation_error として扱う
      }
    }

    if (!commentId) {
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
      logError("board.comments.api.user_not_found", {
        email,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const tenantIds = await getActiveTenantIdsForUser(supabase, appUser.id);

    if (!tenantIds.length) {
      logError("board.comments.api.membership_error", {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const comment = await prisma.board_comments.findFirst({
      where: {
        id: commentId,
        tenant_id: { in: tenantIds },
      },
      select: {
        id: true,
        tenant_id: true,
        author_id: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ errorCode: "comment_not_found" }, { status: 404 });
    }

    const tenantId = comment.tenant_id as string;

    if (comment.author_id !== appUser.id) {
      return NextResponse.json({ errorCode: "forbidden" }, { status: 403 });
    }

    try {
      // まず論理削除（status = 'deleted'）を試みる
      await prisma.board_comments.update({
        where: {
          id: commentId,
        },
        data: {
          status: "deleted" as any,
        },
      });
    } catch (error) {
      // comment_status enum 未更新などで失敗した場合は物理削除にフォールバック
      logError("board.comments.api.soft_delete_failed", {
        tenantId,
        userId: appUser.id,
        commentId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      try {
        await prisma.board_comments.delete({
          where: {
            id: commentId,
          },
        });
      } catch (hardError) {
        logError("board.comments.api.delete_failed", {
          tenantId,
          userId: appUser.id,
          commentId,
          errorMessage:
            hardError instanceof Error ? hardError.message : String(hardError),
        });
        return NextResponse.json({ errorCode: "comment_delete_failed" }, { status: 500 });
      }
    }

    logInfo("board.comments.api.delete_success", {
      tenantId,
      userId: appUser.id,
      commentId,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logError("board.comments.api.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}
