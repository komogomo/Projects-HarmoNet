import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logError } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError('board.notifications.api.auth_error', {
        reason: authError?.message ?? 'no_session',
      });
      return NextResponse.json({ hasUnread: false }, { status: 401 });
    }

    const email = user.email;

    const {
      data: appUser,
      error: appUserError,
    } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('status', 'active')
      .maybeSingle();

    if (appUserError || !appUser) {
      logError('board.notifications.api.user_not_found', {
        email,
      });
      return NextResponse.json({ hasUnread: false }, { status: 403 });
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', appUser.id)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      logError('board.notifications.api.membership_error', {
        userId: appUser.id,
      });
      return NextResponse.json({ hasUnread: false }, { status: 403 });
    }

    const tenantId = membership.tenant_id as string;

    let boardLastSeenAt: Date | null = null;
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
        boardLastSeenAt = current.board_last_seen_at;
      }
    } catch (error) {
      logError('board.notifications.api.has_unread_read_current_error', {
        userId: appUser.id,
        tenantId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }

    // latest_post_at: テナント内の「管理組合（tenant_admin）による」published 投稿の最大 created_at
    const latestPost = await prisma.board_posts.findFirst({
      where: {
        tenant_id: tenantId,
        status: 'published',
        author: {
          user_roles: {
            some: {
              tenant_id: tenantId,
              role: {
                role_key: 'tenant_admin',
              },
            },
          },
        },
      },
      select: {
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // 投稿が 1 件もない場合は未読なし
    if (!latestPost) {
      return NextResponse.json({ hasUnread: false }, { status: 200 });
    }

    const latestPostAt = latestPost.created_at as Date;

    // 未読判定仕様:
    //   - board_last_seen_at が NULL の場合 → 通知あり
    //   - latest_post_at > board_last_seen_at の場合 → 通知あり
    //   - それ以外 → 通知なし
    const hasUnread = !boardLastSeenAt
      ? true
      : latestPostAt.getTime() > boardLastSeenAt.getTime();

    return NextResponse.json({ hasUnread }, { status: 200 });
  } catch (error) {
    logError('board.notifications.api.has_unread_unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ hasUnread: false }, { status: 500 });
  }
}
