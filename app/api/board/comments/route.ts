import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";
import { BoardPostTranslationService } from "@/src/server/services/translation/BoardPostTranslationService";
import { GoogleTranslationService, type SupportedLang } from "@/src/server/services/translation/GoogleTranslationService";
import { getActiveTenantIdsForUser } from "@/src/server/tenant/getActiveTenantIdsForUser";

interface CreateBoardCommentRequestBody {
  postId?: string;
  content?: string;
  authorType?: "admin" | "user";
  displayMode?: "anonymous" | "nickname";
}

const MIN_COMMENT_LENGTH = 1;
const MAX_COMMENT_LENGTH = 2000;

export async function POST(req: Request) {
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

    const {
      data: appUser,
      error: appUserError,
    } = await supabase
      .from("users")
      .select("id, display_name")
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

    const body = (await req.json().catch(() => ({}))) as CreateBoardCommentRequestBody;
    const postId = typeof body.postId === "string" ? body.postId : null;
    const rawContent = typeof body.content === "string" ? body.content : "";
    const content = rawContent.trim();

    if (!postId) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    if (!content || content.length < MIN_COMMENT_LENGTH) {
      return NextResponse.json({ errorCode: "comment_empty" }, { status: 400 });
    }

    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ errorCode: "comment_empty" }, { status: 400 });
    }

    const post = await prisma.board_posts.findFirst({
      where: {
        id: postId,
        status: "published",
        tenant_id: { in: tenantIds },
      },
      select: {
        id: true,
        tenant_id: true,
        category: {
          select: {
            category_key: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ errorCode: "post_not_found" }, { status: 404 });
    }

    const tenantId = post.tenant_id as string;

    const categoryKey = (post as any).category?.category_key as string | undefined;
    const managementCategoryKeys = ["important", "circular", "event", "rules"];
    if (categoryKey && managementCategoryKeys.includes(categoryKey)) {
      return NextResponse.json({ errorCode: "forbidden" }, { status: 403 });
    }

    let isTenantAdmin = false;

    try {
      const {
        data: userRoles,
        error: userRolesError,
      } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", appUser.id)
        .eq("tenant_id", tenantId);

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
            isTenantAdmin = roles.some(
              (role: any) =>
                role.role_key === "tenant_admin" || role.role_key === "system_admin",
            );
          }
        }
      }
    } catch {
      isTenantAdmin = false;
    }

    const requestedAuthorType =
      body && body.authorType === "admin" ? "admin" : "user";

    const finalAuthorType: "admin" | "user" =
      isTenantAdmin && requestedAuthorType === "admin" ? "admin" : "user";

    const displayMode: "anonymous" | "nickname" =
      body && body.displayMode === "anonymous" ? "anonymous" : "nickname";

    const sessionDisplayName =
      typeof (appUser as any).display_name === "string"
        ? ((appUser as any).display_name as string)
        : null;

    let authorDisplayName: string;

    if (finalAuthorType === "admin") {
      authorDisplayName = "管理組合";
    } else if (displayMode === "anonymous") {
      authorDisplayName = "匿名";
    } else {
      authorDisplayName = sessionDisplayName ?? "匿名";
    }

    let commentId: string;

    try {
      const created = await prisma.board_comments.create({
        data: {
          tenant_id: tenantId,
          post_id: postId,
          author_id: appUser.id,
          content,
          status: "active" as any,
          author_display_name: authorDisplayName,
        },
        select: {
          id: true,
        },
      });

      commentId = created.id;
    } catch (error) {
      logError("board.comments.api.create_failed", {
        tenantId,
        postId,
        userId: appUser.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ errorCode: "comment_create_failed" }, { status: 500 });
    }

    // コメント本文の翻訳キャッシュ（将来の多言語表示用）
    try {
      const translationService = new GoogleTranslationService();
      const serviceRoleSupabase = createSupabaseServiceRoleClient();
      const boardTranslation = new BoardPostTranslationService({
        supabase: serviceRoleSupabase,
        translationService,
      });

      const textForDetect = content;
      const allLangs: SupportedLang[] = ["ja", "en", "zh"];

      let sourceLang: SupportedLang = "ja";
      try {
        const detected = await translationService.detectLanguageOnce(textForDetect);
        if (detected === "ja" || detected === "en" || detected === "zh") {
          sourceLang = detected;
        }
      } catch {
        sourceLang = "ja";
      }

      const targetLangs = allLangs.filter((lang) => lang !== sourceLang) as SupportedLang[];

      await boardTranslation.translateAndCacheForComment({
        tenantId,
        commentId,
        sourceLang,
        targetLangs,
        originalBody: content,
      });
    } catch (error) {
      logError("board.comments.api.translation_error", {
        tenantId,
        commentId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }

    logInfo("board.comments.api.create_success", {
      tenantId,
      postId,
      userId: appUser.id,
      commentId,
    });

    return NextResponse.json({ ok: true, commentId }, { status: 201 });
  } catch (error) {
    logError("board.comments.api.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}
