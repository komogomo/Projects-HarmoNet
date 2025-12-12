import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";

interface FavoriteRequestBody {
  postId?: string;
}

type AuthErrorBody = { errorCode: "auth_error" | "unauthorized" };

type AuthErrorResult = {
  error: {
    status: 401 | 403;
    body: AuthErrorBody;
  };
};

type AuthSuccessResult = {
  context: {
    userId: string;
    authUserId: string;
  };
};

type AuthResult = AuthErrorResult | AuthSuccessResult;

async function resolveAuthContext(): Promise<AuthResult> {
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

  const {
    data: appUser,
    error: appUserError,
  } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (appUserError || !appUser) {
    logError("board.favorites.api.user_not_found", {
      userId: user.id,
    });
    return { error: { status: 403 as const, body: { errorCode: "unauthorized" as const } } };
  }

  return {
    context: {
      userId: appUser.id as string,
      authUserId: user.id as string,
    },
  };
}

function isAuthError(result: AuthResult): result is AuthErrorResult {
  return "error" in result;
}

function normalizePostStatus(rawStatus: string | null): "draft" | "pending" | "archived" | "published" {
  return rawStatus === "draft" || rawStatus === "pending" || rawStatus === "archived"
    ? rawStatus
    : "published";
}

async function hasAdminRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(role_key)")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  return (
    userRoles?.some(
      (r: any) => r.roles?.role_key === "tenant_admin" || r.roles?.role_key === "system_admin",
    ) ?? false
  );
}

async function assertFavoritePermission(params: { userId: string; postId: string }) {
  const { userId, postId } = params;
  const supabase = await createSupabaseServerClient();

  const post = await prisma.board_posts.findFirst({
    where: { id: postId },
    select: {
      id: true,
      tenant_id: true,
      author_id: true,
      status: true,
    },
  });

  if (!post) {
    return { ok: false as const, res: NextResponse.json({ errorCode: "not_found" }, { status: 404 }) };
  }

  const tenantId = post.tenant_id as string;

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (membershipError || !membership?.tenant_id) {
    logError("board.favorites.api.membership_error", {
      userId,
    });
    return {
      ok: false as const,
      res: NextResponse.json({ errorCode: "unauthorized" }, { status: 403 }),
    };
  }

  const normalizedStatus = normalizePostStatus(((post as any).status as string | null) ?? null);

  if (normalizedStatus !== "published") {
    const isAuthor = post.author_id === userId;
    const admin = await hasAdminRole(supabase, userId, tenantId);
    if (!isAuthor && !admin) {
      return {
        ok: false as const,
        res: NextResponse.json({ errorCode: "forbidden" }, { status: 403 }),
      };
    }
  }

  return { ok: true as const, tenantId };
}

export async function POST(req: Request) {
  try {
    const auth = await resolveAuthContext();
    if (isAuthError(auth)) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { userId } = auth.context;

    const body = (await req.json().catch(() => ({}))) as FavoriteRequestBody;
    const postId = typeof body.postId === "string" ? body.postId : null;

    if (!postId) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    const permission = await assertFavoritePermission({ userId, postId });
    if (!permission.ok) {
      return permission.res;
    }

    const { tenantId } = permission;

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
    if (isAuthError(auth)) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { userId } = auth.context;

    const body = (await req.json().catch(() => ({}))) as FavoriteRequestBody;
    const postId = typeof body.postId === "string" ? body.postId : null;

    if (!postId) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    const permission = await assertFavoritePermission({ userId, postId });
    if (!permission.ok) {
      return permission.res;
    }

    const { tenantId } = permission;

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