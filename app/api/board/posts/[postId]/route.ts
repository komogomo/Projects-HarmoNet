import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
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

    if (post.author_id !== appUser.id) {
      return NextResponse.json({ errorCode: "forbidden" }, { status: 403 });
    }

    try {
      // Soft delete: archive the post so it no longer appears on the board
      await prisma.board_posts.update({
        where: {
          id: postId,
        },
        data: {
          status: "archived" as any,
        },
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
