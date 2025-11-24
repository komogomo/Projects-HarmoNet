import { prisma } from '@/src/server/db/prisma';

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

export interface BoardCommentDto {
  id: string;
  content: string;
  authorDisplayName: string;
  createdAt: string;
}

export interface BoardPostDetailDto {
  id: string;
  categoryKey: string;
  categoryName: string | null;
  originalTitle: string;
  originalContent: string;
  authorDisplayName: string;
  authorDisplayType: 'management' | 'user';
  createdAt: string;
  hasAttachment: boolean;
  translations: BoardPostTranslationDto[];
  attachments: BoardAttachmentDto[];
  comments: BoardCommentDto[];
}

export interface GetBoardPostByIdParams {
  tenantId: string;
  postId: string;
  currentUserId: string;
}

export async function getBoardPostById(
  params: GetBoardPostByIdParams,
): Promise<BoardPostDetailDto | null> {
  const { tenantId, postId } = params;

  const post = await prisma.board_posts.findFirst({
    where: {
      id: postId,
      tenant_id: tenantId,
      status: 'published',
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
        where: { status: 'active' } as any,
        select: {
          id: true,
          content: true,
          created_at: true,
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
      fileUrl: attachment.file_url,
      fileType: attachment.file_type,
      fileSize: attachment.file_size,
    }),
  );

  const comments: BoardCommentDto[] = post.comments.map(
    (comment: {
      id: string;
      content: string;
      created_at: Date;
      author: { display_name: string };
    }): BoardCommentDto => ({
      id: comment.id,
      content: comment.content,
      authorDisplayName: comment.author.display_name,
      createdAt: comment.created_at.toISOString(),
    }),
  );

  return {
    id: post.id,
    categoryKey: post.category.category_key,
    categoryName: post.category.category_name,
    originalTitle: post.title,
    originalContent: post.content,
    authorDisplayName: post.author.display_name,
    authorDisplayType: 'user',
    createdAt: post.created_at.toISOString(),
    hasAttachment: attachments.length > 0,
    translations,
    attachments,
    comments,
  };
}
