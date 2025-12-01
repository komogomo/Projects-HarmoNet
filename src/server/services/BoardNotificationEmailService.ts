import { prisma } from '@/src/server/db/prisma';
import { logInfo, logError } from '@/src/lib/logging/log.util';

interface SendBoardNotificationEmailsParams {
  tenantId: string;
  postId: string;
}

export async function sendBoardNotificationEmailsForPost(
  params: SendBoardNotificationEmailsParams,
): Promise<void> {
  const { tenantId, postId } = params;

  try {
    const post: any = await prisma.board_posts.findFirst({
      where: {
        id: postId,
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
        id: true,
        title: true,
        content: true,
        created_at: true,
        category: {
          select: {
            category_key: true,
            category_name: true,
          },
        },
      },
    } as any);

    if (!post) {
      logInfo('board.notifications.email.skip_not_management_or_not_found', {
        tenantId,
        postId,
      });
      return;
    }

    const memberships: any[] = await prisma.user_tenants.findMany({
      where: {
        tenant_id: tenantId,
        tenant: {
          status: 'active',
        },
      },
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
    } as any);

    const recipientEmails = memberships
      .map((m: any) => (m.user?.email && typeof m.user.email === 'string' ? m.user.email : null))
      .filter((email: string | null): email is string => !!email);

    if (recipientEmails.length === 0) {
      logInfo('board.notifications.email.no_active_recipients', {
        tenantId,
        postId,
      });
      return;
    }

    const subject = '【HarmoNet】管理組合から新しいお知らせが投稿されました';

    const createdAtIso = post.created_at instanceof Date ? post.created_at.toISOString() : String(post.created_at);

    for (const email of recipientEmails) {
      logInfo('board.notifications.email.debug_send', {
        tenantId,
        postId,
        email,
        subject,
        categoryKey: post.category?.category_key ?? null,
        categoryName: post.category?.category_name ?? null,
        title: post.title,
        createdAt: createdAtIso,
      });
    }
  } catch (error) {
    logError('board.notifications.email.unexpected_error', {
      tenantId,
      postId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}
