import { prisma } from '@/src/server/db/prisma';
import { GoogleTranslationService } from '@/src/server/services/translation/GoogleTranslationService';

const SUPPORTED_LANGS = ['ja', 'en', 'zh'] as const;

export type SupportedBoardLang = (typeof SUPPORTED_LANGS)[number];

export interface BoardPostTranslationDto {
  lang: SupportedBoardLang;
  title: string | null;
  content: string;
}

export interface BoardAttachmentDto {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface BoardCommentTranslationDto {
  lang: SupportedBoardLang;
  content: string;
}

export interface BoardCommentDto {
  id: string;
  content: string;
  status: 'active' | 'deleted';
  authorDisplayName: string;
  createdAt: string;
  updatedAt: string;
  isDeletable: boolean;
  translations: BoardCommentTranslationDto[];
}

export interface BoardPostDetailDto {
  id: string;
  categoryKey: string;
  categoryName: string | null;
  sourceLang: SupportedBoardLang | null;
  originalTitle: string;
  originalContent: string;
  authorDisplayName: string;
  authorDisplayType: 'management' | 'user';
  createdAt: string;
  hasAttachment: boolean;
  translations: BoardPostTranslationDto[];
  attachments: BoardAttachmentDto[];
  comments: BoardCommentDto[];
  isFavorite: boolean;
  isDeletable: boolean;
  status: 'draft' | 'pending' | 'published' | 'archived';
  authorRole: 'management' | 'general';
  viewerRole: 'admin' | 'user';
  isAuthor: boolean;
  approvalCount: number;
  hasApprovedByCurrentUser: boolean;
}

export interface GetBoardPostByIdParams {
  tenantId: string;
  postId: string;
  currentUserId: string;
}

export async function getBoardPostById(
  params: GetBoardPostByIdParams,
): Promise<BoardPostDetailDto | null> {
  const { tenantId, postId, currentUserId } = params;

  const post = await prisma.board_posts.findFirst({
    where: {
      id: postId,
      tenant_id: tenantId,
    },
    include: {
      category: {
        select: {
          category_key: true,
          category_name: true,
        },
      },
      translations: {
        select: {
          lang: true,
          title: true,
          content: true,
        },
      },
      attachments: {
        select: {
          id: true,
          file_url: true,
          file_name: true,
          file_type: true,
          file_size: true,
        },
      },
      comments: {
        // Prisma Client の型定義が comment_status をまだ認識していない可能性があるため、
        // where 句は any キャストで付与する。
        where: {} as any,
        select: {
          id: true,
          content: true,
          status: true,
          author_id: true,
          created_at: true,
          updated_at: true,
          author_display_name: true,
          boardCommentTranslations: {
            select: {
              lang: true,
              content: true,
            },
          },
          author: {
            select: {
              display_name: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
      },
      author: {
        select: {
          display_name: true,
        },
      },
    },
  });

  if (!post) {
    return null;
  }

  const translations: BoardPostTranslationDto[] = post.translations
    .filter((t: { lang: string | null }) =>
      SUPPORTED_LANGS.includes((t.lang ?? '') as SupportedBoardLang),
    )
    .map((t: { lang: string | null; title: string | null; content: string }) => ({
      lang: t.lang as SupportedBoardLang,
      title: t.title,
      content: t.content,
    }));

  const attachments: BoardAttachmentDto[] = post.attachments.map(
    (attachment: {
      id: string;
      file_url: string;
      file_name: string;
      file_type: string;
      file_size: number;
    }): BoardAttachmentDto => ({
      id: attachment.id,
      fileName: attachment.file_name,
      fileUrl: `/api/board/attachments/${attachment.id}`,
      fileType: attachment.file_type,
      fileSize: attachment.file_size,
    }),
  );

  // 承認数と本人承認済みフラグを集計
  let approvalCount = 0;
  let hasApprovedByCurrentUser = false;
  try {
    const approvals = await (prisma as any).board_approval_logs.findMany({
      where: {
        tenant_id: tenantId,
        post_id: postId,
        action: 'approve',
      },
      select: {
        approver_id: true,
      },
    });

    const uniqueApproverIds = Array.from(
      new Set(
        approvals
          .map((row: any) => row.approver_id)
          .filter((id: unknown): id is string => typeof id === 'string'),
      ),
    );

    approvalCount = uniqueApproverIds.length;
    hasApprovedByCurrentUser = uniqueApproverIds.includes(currentUserId);
  } catch {
    approvalCount = 0;
    hasApprovedByCurrentUser = false;
  }

  const authorDisplayName =
    (post as any).author_display_name && typeof (post as any).author_display_name === 'string'
      ? ((post as any).author_display_name as string)
      : post.author.display_name;

  let isFavorite = false;
  try {
    const favorite = await (prisma as any).board_favorites.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: currentUserId,
        post_id: postId,
      },
      select: {
        id: true,
      },
    });
    isFavorite = !!favorite;
  } catch {
    isFavorite = false;
  }

  let hasAdminRole = false;
  try {
    const userRoles = await (prisma as any).user_roles.findMany({
      where: {
        user_id: currentUserId,
        tenant_id: tenantId,
      },
      select: {
        role: {
          select: {
            role_key: true,
          },
        },
      },
    });

    if (Array.isArray(userRoles) && userRoles.length > 0) {
      hasAdminRole = userRoles.some(
        (row: any) =>
          row.role?.role_key === 'tenant_admin' || row.role?.role_key === 'system_admin',
      );
    }
  } catch {
    hasAdminRole = false;
  }

  const isAuthor = (post as any).author_id === currentUserId;

  const rawStatus = (post as any).status as string | null;
  const normalizedStatus: 'draft' | 'pending' | 'published' | 'archived' =
    rawStatus === 'draft' || rawStatus === 'pending' || rawStatus === 'archived'
      ? rawStatus
      : 'published';

  // 一般利用者は公開済み以外の投稿を閲覧できない。
  // 管理組合メンバーまたは投稿者本人のみ、pending 等も閲覧を許可する。
  if (normalizedStatus !== 'published' && !isAuthor && !hasAdminRole) {
    return null;
  }

  const rawAuthorRole = (post as any).author_role as string | null;
  const authorRole: 'management' | 'general' =
    rawAuthorRole === 'management' ? 'management' : 'general';

  const comments: BoardCommentDto[] = post.comments.map(
    (comment: {
      id: string;
      content: string;
      status: string;
      author_id: string;
      created_at: Date;
      updated_at: Date;
      boardCommentTranslations?: { lang: string | null; content: string }[];
      author: { display_name: string };
    }): BoardCommentDto => {
      const translations: BoardCommentTranslationDto[] =
        (comment.boardCommentTranslations ?? [])
          .filter((tr) =>
            SUPPORTED_LANGS.includes((tr.lang ?? '') as SupportedBoardLang),
          )
          .map((tr) => ({
            lang: tr.lang as SupportedBoardLang,
            content: tr.content,
          }));

      const normalizedStatus = comment.status === 'deleted' ? 'deleted' : 'active';

      const authorDisplayName =
        (comment as any).author_display_name &&
          typeof (comment as any).author_display_name === 'string'
          ? ((comment as any).author_display_name as string)
          : comment.author.display_name || '匿名';

      return {
        id: comment.id,
        content: comment.content,
        status: normalizedStatus as 'active' | 'deleted',
        authorDisplayName,
        createdAt: comment.created_at.toISOString(),
        updatedAt: comment.updated_at.toISOString(),
        // コメントの削除権限は投稿者本人のみとする（管理組合による一括削除は別仕様）
        isDeletable:
          normalizedStatus === 'active' && (comment.author_id === currentUserId || hasAdminRole),
        translations,
      };
    },
  );

  // Detect source language
  let sourceLang: SupportedBoardLang | null = null;
  try {
    const translationService = new GoogleTranslationService();
    // タイトルは英語（例: "Meeting Minutes"）だが本文は日本語、というケースで誤判定を防ぐため、
    // 本文のみを使って言語検出を行う。
    const textForDetect = post.content;
    const detected = await translationService.detectLanguageOnce(textForDetect);
    if (detected && SUPPORTED_LANGS.includes(detected as SupportedBoardLang)) {
      sourceLang = detected as SupportedBoardLang;
    }
  } catch {
    // Ignore detection errors
  }

  return {
    id: post.id,
    categoryKey: post.category.category_key,
    categoryName: post.category.category_name,
    sourceLang,
    originalTitle: post.title,
    originalContent: post.content,
    authorDisplayName,
    authorDisplayType: authorRole === 'management' ? 'management' : 'user',
    createdAt: post.created_at.toISOString(),
    hasAttachment: attachments.length > 0,
    translations,
    attachments,
    comments,
    isFavorite,
    isDeletable: isAuthor || hasAdminRole,
    status: normalizedStatus,
    authorRole,
    viewerRole: hasAdminRole ? 'admin' : 'user',
    isAuthor,
    approvalCount,
    hasApprovedByCurrentUser,
  };
}
