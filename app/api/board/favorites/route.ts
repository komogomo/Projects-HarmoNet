import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";

interface FavoriteRequestBody {
  postId?: string;
}

async function resolveAuthContext() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError("board.favorites.api.auth_error", {
      reason: authError?.message ?? "no_session",
    });
    return { error: { status: 401 as const, body: { errorCode: "auth_error" as const } } };
  }

  const email = user.email;

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
    logError("board.favorites.api.user_not_found", {
      email,
    });
    return { error: { status: 403 as const, body: { errorCode: "unauthorized" as const } } };
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", appUser.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership?.tenant_id) {
    logError("board.favorites.api.membership_error", {
      userId: appUser.id,
    });
    return { error: { status: 403 as const, body: { errorCode: "unauthorized" as const } } };
  }

  return {
    context: {
      tenantId: membership.tenant_id as string,
      userId: appUser.id as string,
    },
  };
}

export async function POST(req: Request) {
  try {
    const auth = await resolveAuthContext();
    if ("error" in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, userId } = auth.context;

    const body = (await req.json().catch(() => ({}))) as FavoriteRequestBody;
    const postId = typeof body.postId === "string" ? body.postId : null;

    if (!postId) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    const post = await prisma.board_posts.findFirst({
      where: {
        id: postId,
        tenant_id: tenantId,
        status: "published",
      },
      select: {
        id: true,
      },
    });

    if (!post) {
      return NextResponse.json({ errorCode: "not_found" }, { status: 404 });
    }

    try {
      await (prisma as any).board_favorites.upsert({
        where: {
          tenant_id_user_id_post_id: {
            tenant_id: tenantId,
            user_id: userId,
            post_id: postId,
          },
        },
        update: {},
        create: {
          tenant_id: tenantId,
          user_id: userId,
          post_id: postId,
        },
      });
    } catch (error) {
      logError("board.favorites.api.create_failed", {
        tenantId,
        userId,
        postId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ errorCode: "favorite_create_failed" }, { status: 500 });
    }

    logInfo("board.favorites.api.created", {
      tenantId,
      userId,
      postId,
    });

    return NextResponse.json({ isFavorite: true }, { status: 200 });
  } catch (error) {
    logError("board.favorites.api.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await resolveAuthContext();
    if ("error" in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, userId } = auth.context;

    const body = (await req.json().catch(() => ({}))) as FavoriteRequestBody;
    const postId = typeof body.postId === "string" ? body.postId : null;

    if (!postId) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    try {
      await (prisma as any).board_favorites.deleteMany({
        where: {
          tenant_id: tenantId,
          user_id: userId,
          post_id: postId,
        },
      });
    } catch (error) {
      logError("board.favorites.api.delete_failed", {
        tenantId,
        userId,
        postId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ errorCode: "favorite_delete_failed" }, { status: 500 });
    }

    logInfo("board.favorites.api.deleted", {
      tenantId,
      userId,
      postId,
    });

    return NextResponse.json({ isFavorite: false }, { status: 200 });
  } catch (error) {
    logError("board.favorites.api.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}
