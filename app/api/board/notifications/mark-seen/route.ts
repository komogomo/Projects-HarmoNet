import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const isSessionMissingError =
      !!authError && authError.message === 'Auth session missing!';

    if (authError && !isSessionMissingError) {
      logError('board.notifications.api.auth_error', {
        reason: authError.message,
      });
      return NextResponse.json({ errorCode: 'auth_error' }, { status: 401 });
    }

    if (!user || !user.email || isSessionMissingError) {
      // 単なる未ログインアクセスは想定内の 401 のため、ログは出さない
      return NextResponse.json({ errorCode: 'auth_error' }, { status: 401 });
    }

    const email = user.email;

    const {
      data: appUser,
      error: appUserError,
    } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (appUserError || !appUser) {
      logError('board.notifications.api.user_not_found', {
        email,
      });
      return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', appUser.id)
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      logError('board.notifications.api.membership_error', {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
    }

    const tenantId = membership.tenant_id as string;

    const body = (await req.json().catch(() => ({}))) as { postId?: string };
    const postId = typeof body.postId === 'string' ? body.postId : undefined;

    if (!postId) {
      logInfo('board.notifications.api.mark_seen_no_post_id', {
        userId: appUser.id,
        tenantId,
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const post = await prisma.board_posts.findFirst({
      where: {
        id: postId,
        tenant_id: tenantId,
        status: 'published',
        author_role: 'management',
      },
      select: {
        created_at: true,
      },
    });

    if (!post) {
      logInfo('board.notifications.api.mark_seen_post_not_found_or_not_published', {
        userId: appUser.id,
        tenantId,
        postId,
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const postCreatedAt = post.created_at;
    let nextSeenAt: Date = postCreatedAt;

    try {
      const current = (await prisma.user_tenants.findUnique({
        where: {
          user_id_tenant_id: {
            user_id: appUser.id,
            tenant_id: tenantId,
          },
        },
        select: {
          board_last_seen_at: true,
        },
      } as any)) as { board_last_seen_at: Date | null } | null;

      if (current?.board_last_seen_at instanceof Date) {
        // 既存の閲覧日時の方が新しい場合は更新しない（過去の投稿を見ても最新の未読を既読にしないため）
        nextSeenAt =
          current.board_last_seen_at > postCreatedAt
            ? current.board_last_seen_at
            : postCreatedAt;
      }
    } catch (error) {
      // 読み取り失敗時はログだけ出して postCreatedAt をそのまま使用する
      logError('board.notifications.api.mark_seen_read_current_error', {
        userId: appUser.id,
        tenantId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      await prisma.user_tenants.update({
        where: {
          user_id_tenant_id: {
            user_id: appUser.id,
            tenant_id: tenantId,
          },
        },
        data: {
          board_last_seen_at: nextSeenAt,
        } as any,
      });
    } catch (error) {
      logError('board.notifications.api.mark_seen_update_error', {
        userId: appUser.id,
        tenantId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ errorCode: 'update_failed' }, { status: 500 });
    }

    logInfo('board.notifications.api.mark_seen_success', {
      userId: appUser.id,
      tenantId,
      postId,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logError('board.notifications.api.mark_seen_unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
