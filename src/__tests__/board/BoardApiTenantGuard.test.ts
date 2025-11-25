import { POST as createComment } from '../../../app/api/board/comments/route';
import { DELETE as deleteComment } from '../../../app/api/board/comments/[commentId]/route';
import { DELETE as deletePost } from '../../../app/api/board/posts/[postId]/route';

const getActiveTenantIdsForUserMock = jest.fn<Promise<string[]>, any[]>();

jest.mock('@/src/lib/supabaseServerClient', () => ({
  createSupabaseServerClient: jest.fn(async () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { email: 'user@example.com' } },
        error: null,
      }),
    },
    from: jest.fn((table: string) => {
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        maybeSingle: jest.fn(),
      };

      if (table === 'users') {
        chain.maybeSingle.mockResolvedValue({ data: { id: 'user-1' }, error: null });
      }

      return chain;
    }),
  })),
}));

jest.mock('@/src/server/tenant/getActiveTenantIdsForUser', () => ({
  getActiveTenantIdsForUser: (...args: any[]) => getActiveTenantIdsForUserMock(...args),
}));

const boardPostsFindFirstMock = jest.fn();
const boardCommentsFindFirstMock = jest.fn();

jest.mock('@/src/server/db/prisma', () => ({
  prisma: {
    board_posts: {
      findFirst: (...args: any[]) => boardPostsFindFirstMock(...args),
      update: jest.fn(),
    },
    board_comments: {
      findFirst: (...args: any[]) => boardCommentsFindFirstMock(...args),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/src/server/services/translation/BoardPostTranslationService', () => ({
  BoardPostTranslationService: jest.fn().mockImplementation(() => ({
    translateAndCacheForComment: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/src/server/services/translation/GoogleTranslationService', () => ({
  GoogleTranslationService: jest.fn().mockImplementation(() => ({
    detectLanguageOnce: jest.fn().mockResolvedValue('ja'),
  })),
}));

describe('Board API tenant guard (WS-B99)', () => {
  beforeEach(() => {
    getActiveTenantIdsForUserMock.mockReset();
    boardPostsFindFirstMock.mockReset();
    boardCommentsFindFirstMock.mockReset();
  });

  test('他テナント投稿へのコメント作成は 404 を返す', async () => {
    getActiveTenantIdsForUserMock.mockResolvedValue(['tenant-a']);
    boardPostsFindFirstMock.mockResolvedValue(null);

    const req = new Request('http://localhost/api/board/comments', {
      method: 'POST',
      body: JSON.stringify({ postId: 'post-other-tenant', content: 'hello' }),
    });

    const res = await createComment(req);

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.errorCode).toBe('post_not_found');

    expect(boardPostsFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: 'post-other-tenant',
        status: 'published',
        tenant_id: { in: ['tenant-a'] },
      },
      select: expect.any(Object),
    });
  });

  test('他テナントコメントの削除は 404 を返す', async () => {
    getActiveTenantIdsForUserMock.mockResolvedValue(['tenant-a']);
    boardCommentsFindFirstMock.mockResolvedValue(null);

    const req = new Request('http://localhost/api/board/comments/comment-other', {
      method: 'DELETE',
    });

    const res = await deleteComment(req, { params: { commentId: 'comment-other' } });

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.errorCode).toBe('comment_not_found');

    expect(boardCommentsFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: 'comment-other',
        tenant_id: { in: ['tenant-a'] },
      },
      select: expect.any(Object),
    });
  });

  test('他テナント投稿の削除は 404 を返す', async () => {
    getActiveTenantIdsForUserMock.mockResolvedValue(['tenant-a']);
    boardPostsFindFirstMock.mockResolvedValue(null);

    const req = new Request('http://localhost/api/board/posts/post-other', {
      method: 'DELETE',
    });

    const res = await deletePost(req, { params: { postId: 'post-other' } });

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.errorCode).toBe('post_not_found');

    expect(boardPostsFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: 'post-other',
        tenant_id: { in: ['tenant-a'] },
      },
      select: expect.any(Object),
    });
  });
});
