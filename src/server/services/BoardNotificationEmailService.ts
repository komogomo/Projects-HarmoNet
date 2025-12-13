import { prisma } from '@/src/server/db/prisma';
import { logInfo, logError } from '@/src/lib/logging/log.util';
import { sendEmail } from '@/src/server/services/SesEmailService';
import {
  buildBoardManagementPostPublishedEmailTemplate,
} from '@/src/server/services/email/templates/boardManagementPostPublished';

interface SendBoardNotificationEmailsParams {
  tenantId: string;
  postId: string;
}

export async function sendBoardNotificationEmailsForPost(
  params: SendBoardNotificationEmailsParams,
): Promise<void> {
  const { tenantId, postId } = params;

  try {
    const baseUrl = process.env.APP_BASE_URL;
    if (!baseUrl) {
      logError('board.notifications.email.misconfigured', {
        tenantId,
        postId,
        reason: 'APP_BASE_URL is not set',
      });
      return;
    }

    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const boardPostUrl = `${normalizedBaseUrl}/board/${postId}`;

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
        tenant: {
          select: {
            tenant_name: true,
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
        user: {
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

    const template = buildBoardManagementPostPublishedEmailTemplate({
      tenantName: post.tenant?.tenant_name ?? null,
      postTitle: post.title,
      categoryName: post.category?.category_name ?? null,
      boardPostUrl,
    });

    logInfo('board.notifications.email.send_start', {
      tenantId,
      postId,
      recipientCount: recipientEmails.length,
    });

    for (const to of recipientEmails) {
      try {
        await sendEmail({
          to,
          subject: template.subject,
          text: template.text,
        });
      } catch (error) {
        logError('board.notifications.email.send_failed', {
          tenantId,
          postId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logInfo('board.notifications.email.send_completed', {
      tenantId,
      postId,
      recipientCount: recipientEmails.length,
    });
  } catch (error) {
    logError('board.notifications.email.unexpected_error', {
      tenantId,
      postId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}
