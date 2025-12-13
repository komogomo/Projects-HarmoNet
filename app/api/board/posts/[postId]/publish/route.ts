import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";
import { getActiveTenantIdsForUser } from "@/src/server/tenant/getActiveTenantIdsForUser";
import { sendBoardNotificationEmailsForPost } from "@/src/server/services/BoardNotificationEmailService";

interface PublishPostRouteContext {
  params?:
    | {
        postId?: string;
      }
    | Promise<{
        postId?: string;
      }>;
}

export async function POST(req: Request, context: PublishPostRouteContext) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError("board.post.publish.auth_error", {
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
        const last = segments[segments.length - 2]; // .../posts/{postId}/publish
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
      logError("board.post.publish.user_not_found", {
        userId: user.id,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const tenantIds = await getActiveTenantIdsForUser(supabase, appUser.id);

    if (!tenantIds.length) {
      logError("board.post.publish.membership_error", {
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
    const isAuthor = post.author_id === appUser.id;

    if (!isAuthor) {
      return NextResponse.json({ errorCode: "forbidden" }, { status: 403 });
    }

    const rawAuthorRole = (post as any).author_role as string | null;
    const rawStatus = (post as any).status as string | null;

    if (rawAuthorRole !== "management" || rawStatus !== "pending") {
      return NextResponse.json({ errorCode: "invalid_state" }, { status: 400 });
    }

    // 承認者数 (distinct approver_id) を集計
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

    if (approvalCount < 2) {
      return NextResponse.json(
        { errorCode: "approval_insufficient", approvalCount },
        { status: 400 },
      );
    }

    // 公開状態へ更新
    await prisma.board_posts.update({
      where: {
        id: postId,
      },
      data: {
        status: "published",
      },
    });

    // 公開時に通知メールを送信
    void sendBoardNotificationEmailsForPost({
      tenantId,
      postId,
    }).catch((error) => {
      logError("board.post.publish.notification_error", {
        tenantId,
        postId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });

    logInfo("board.post.publish.success", {
      tenantId,
      postId,
      userId: appUser.id,
      approvalCount,
    });

    return NextResponse.json({ ok: true, status: "published" }, { status: 200 });
  } catch (error) {
    logError("board.post.publish.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}
