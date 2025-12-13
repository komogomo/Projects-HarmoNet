import { prisma } from '@/src/server/db/prisma';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import { sendEmail } from '@/src/server/services/SesEmailService';
import {
  buildBoardApprovalCompletedToAuthorEmailTemplate,
} from '@/src/server/services/email/templates/boardApprovalCompletedToAuthor';

interface SendBoardApprovalCompletedToAuthorEmailParams {
  tenantId: string;
  postId: string;
}

export async function sendBoardApprovalCompletedToAuthorEmail(
  params: SendBoardApprovalCompletedToAuthorEmailParams,
): Promise<void> {
  const { tenantId, postId } = params;

  const baseUrl = process.env.APP_BASE_URL;

  if (!baseUrl) {
    logError('email.board.approval_completed_to_author.misconfigured', {
      reason: 'APP_BASE_URL is not set',
      tenantId,
      postId,
    });
    return;
  }

  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const boardPostUrl = `${normalizedBaseUrl}/board/${postId}`;

  const post = await prisma.board_posts.findFirst({
    where: {
      id: postId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      title: true,
      author: {
        select: {
          id: true,
          email: true,
          display_name: true,
          last_name: true,
          first_name: true,
        },
      },
      tenant: {
        select: {
          tenant_name: true,
        },
      },
    },
  });

  if (!post) {
    logInfo('email.board.approval_completed_to_author.skip_post_not_found', {
      tenantId,
      postId,
    });
    return;
  }

  const to = post.author?.email;

  if (!to || typeof to !== 'string') {
    logInfo('email.board.approval_completed_to_author.skip_author_email_missing', {
      tenantId,
      postId,
    });
    return;
  }

  const fullName = (() => {
    const firstName = post.author?.first_name;
    const lastName = post.author?.last_name;
    const combined = `${firstName ?? ''}${lastName ?? ''}`;
    return combined.trim().length > 0 ? combined : '';
  })();

  logInfo('email.board.approval_completed_to_author.send_start', {
    tenantId,
    postId,
    authorUserId: post.author?.id ?? null,
  });

  const template = buildBoardApprovalCompletedToAuthorEmailTemplate({
    fullName,
    tenantName: post.tenant?.tenant_name ?? null,
    postTitle: post.title,
    boardPostUrl,
  });

  await sendEmail({
    to,
    subject: template.subject,
    text: template.text,
  });
}
