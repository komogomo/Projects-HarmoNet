import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';
import { sendBoardNotificationEmailsForPost } from '@/src/server/services/BoardNotificationEmailService';
import { callOpenAiModeration, decideModeration, maskSensitiveText, saveModerationLog, type TenantModerationConfig } from '@/src/server/services/moderationService';
import { BoardPostTranslationService } from '@/src/server/services/translation/BoardPostTranslationService';
import { GoogleTranslationService, type SupportedLang } from '@/src/server/services/translation/GoogleTranslationService';
import { getBoardAttachmentSettingsForTenant } from '@/src/lib/boardAttachmentSettings';

interface UpsertBoardPostRequest {
  tenantId: string;
  authorId: string;
  authorRole: 'admin' | 'user';
  displayNameMode?: 'anonymous' | 'nickname';
  categoryKey: string;
  title: string;
  content: string;
  forceMasked?: boolean;
  uiLanguage?: SupportedLang;
}

interface BoardPostTranslationDto {
  lang: 'ja' | 'en' | 'zh';
  title: string | null;
  content: string;
}

interface BoardPostSummaryDto {
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
  isFavorite: boolean;
  replyCount: number;
  isManagementNotice: boolean;
  isUnreadNotice: boolean;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const url = new URL(req.url);
    const tenantIdFromQuery = url.searchParams.get('tenantId');

    if (!tenantIdFromQuery) {
      return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError('board.posts.api.auth_error', {
        reason: authError?.message ?? 'no_session',
      });
      return NextResponse.json({ errorCode: 'auth_error' }, { status: 401 });
    }

    const {
      data: appUser,
      error: appUserError,
    } = await supabase
      .from('users')
      .select('id, group_code')
      .eq('email', user.email)
      .maybeSingle();

    if (appUserError || !appUser) {
      logError('board.posts.api.user_not_found', {
        email: user.email,
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
      .eq('tenant_id', tenantIdFromQuery)
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      logError('board.posts.api.membership_error', {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
    }

    const tenantId = membership.tenant_id as string;

    // Check user roles for admin privileges
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('roles(role_key)')
      .eq('user_id', appUser.id)
      .eq('tenant_id', tenantId);

    const isAdmin =
      userRoles?.some(
        (r: any) => r.roles?.role_key === 'tenant_admin' || r.roles?.role_key === 'system_admin',
      ) ?? false;

    const whereCondition: any = {
      tenant_id: tenantId,
      // 一般利用者には公開済み(post_status = 'published') のみ返し、
      // 管理組合メンバーには承認待ち(pending)と公開済み(published)の両方を返す。
      status: isAdmin ? { in: ['pending', 'published'] } : 'published',
    };

    // Apply group filtering if not admin
    if (!isAdmin) {
      whereCondition.OR = [
        {
          category: {
            category_key: {
              not: 'group',
            },
          },
        },
        {
          AND: [
            {
              category: {
                category_key: 'group',
              },
            },
            {
              author: {
                group_code: appUser.group_code,
              },
            },
          ],
        },
      ];
    }

    // board_last_seen_at: 最後に「管理組合として投稿されたお知らせ」の詳細を閲覧した日時
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
      logError('board.posts.api.read_board_last_seen_error', {
        userId: appUser.id,
        tenantId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }

    const posts = (await prisma.board_posts.findMany({
      where: whereCondition,
      orderBy: {
        created_at: 'desc',
      },
      take: 50,
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
          },
        },
        author: {
          select: {
            display_name: true,
            group_code: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
        favorites: {
          where: {
            tenant_id: tenantId,
            user_id: appUser.id,
          },
          select: {
            id: true,
          },
        },
      },
    } as any)) as any[];

    const summaries: BoardPostSummaryDto[] = posts.map((post) => {
      const authorDisplayName =
        (post as any).author_display_name && typeof (post as any).author_display_name === 'string'
          ? ((post as any).author_display_name as string)
          : post.author.display_name;

      const favorites = (post as any).favorites as { id: string }[] | undefined;
      const isFavorite = Array.isArray(favorites) && favorites.length > 0;

      const rawReplyCount = (post as any)._count?.comments;
      const replyCount = typeof rawReplyCount === 'number' ? rawReplyCount : 0;

      const createdAtDate = post.created_at as Date;
      const authorRoleRaw = (post as any).author_role as string | null | undefined;
      const isManagementNotice = authorRoleRaw === 'management';
      const isUnreadNotice =
        isManagementNotice &&
        (!boardLastSeenAt || createdAtDate.getTime() > boardLastSeenAt.getTime());

      return {
        id: post.id,
        categoryKey: post.category.category_key,
        categoryName: post.category.category_name,
        originalTitle: post.title,
        originalContent: post.content,
        authorDisplayName,
        authorDisplayType: 'user',
        createdAt: post.created_at.toISOString(),
        hasAttachment: post.attachments.length > 0,
        translations: post.translations.map((t: any) => ({
          lang: t.lang as 'ja' | 'en' | 'zh',
          title: t.title,
          content: t.content,
        })),
        isFavorite,
        replyCount,
        isManagementNotice,
        isUnreadNotice,
      };
    });

    return NextResponse.json(
      {
        posts: summaries,
      },
      { status: 200 },
    );
  } catch (error) {
    logError('board.posts.api.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError('board.post.api.auth_error', {
        reason: authError?.message ?? 'no_session',
      });
      return NextResponse.json({ errorCode: 'auth_error' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') ?? '';
    const isMultipart = contentType.includes('multipart/form-data');

    let tenantIdFromBody: string | null = null;
    let authorId: string | null = null;
    let categoryKey: string | null = null;
    let title: string | null = null;
    let content: string | null = null;
    let forceMasked = false;
    let uiLanguage: SupportedLang | undefined;
    let attachmentFiles: File[] = [];
    let displayNameMode: 'anonymous' | 'nickname' | null = null;
    let authorRole: 'admin' | 'user' = 'user';

    if (isMultipart) {
      const formData = await req.formData();

      const tenantIdValue = formData.get('tenantId');
      const authorIdValue = formData.get('authorId');
      const categoryKeyValue = formData.get('categoryKey');
      const titleValue = formData.get('title');
      const contentValue = formData.get('content');
      const forceMaskedValue = formData.get('forceMasked');
      const uiLanguageValue = formData.get('uiLanguage');
      const displayNameModeValue = formData.get('displayNameMode');
      const authorRoleValue = formData.get('authorRole');

      tenantIdFromBody = typeof tenantIdValue === 'string' ? tenantIdValue : null;
      authorId = typeof authorIdValue === 'string' ? authorIdValue : null;
      categoryKey = typeof categoryKeyValue === 'string' ? categoryKeyValue : null;
      title = typeof titleValue === 'string' ? titleValue : null;
      content = typeof contentValue === 'string' ? contentValue : null;

      if (typeof forceMaskedValue === 'string') {
        forceMasked = forceMaskedValue === 'true';
      }

      if (typeof uiLanguageValue === 'string') {
        if (uiLanguageValue === 'ja' || uiLanguageValue === 'en' || uiLanguageValue === 'zh') {
          uiLanguage = uiLanguageValue;
        }
      }

      if (typeof displayNameModeValue === 'string') {
        if (displayNameModeValue === 'anonymous' || displayNameModeValue === 'nickname') {
          displayNameMode = displayNameModeValue;
        }
      }

      if (typeof authorRoleValue === 'string') {
        if (authorRoleValue === 'admin' || authorRoleValue === 'user') {
          authorRole = authorRoleValue;
        }
      }

      const rawAttachments = formData.getAll('attachments');
      attachmentFiles = rawAttachments.filter((value): value is File => value instanceof File);
    } else {
      const body = (await req.json()) as UpsertBoardPostRequest;
      tenantIdFromBody = body.tenantId;
      authorId = body.authorId;
      categoryKey = body.categoryKey;
      title = body.title;
      content = body.content;
      forceMasked = body.forceMasked ?? false;
      uiLanguage = body.uiLanguage;
      if (body.displayNameMode === 'anonymous' || body.displayNameMode === 'nickname') {
        displayNameMode = body.displayNameMode;
      }
      if (body.authorRole === 'admin' || body.authorRole === 'user') {
        authorRole = body.authorRole;
      }
      attachmentFiles = [];
    }

    if (!tenantIdFromBody || !authorId || !categoryKey || !title || !content) {
      return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
    }

    const {
      data: appUser,
      error: appUserError,
    } = await supabase
      .from('users')
      .select('id')
      .eq('id', authorId)
      .eq('email', user.email)
      .maybeSingle();

    if (appUserError || !appUser) {
      logError('board.post.api.user_not_found', {
        email: user.email,
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
      .eq('tenant_id', tenantIdFromBody)
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      logError('board.post.api.membership_error', {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
    }

    const tenantId = membership.tenant_id as string;

    const attachmentSettings = getBoardAttachmentSettingsForTenant(tenantId);

    if (attachmentFiles.length > 0) {
      if (
        attachmentSettings.maxCountPerPost !== null &&
        attachmentFiles.length > attachmentSettings.maxCountPerPost
      ) {
        return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
      }

      for (const file of attachmentFiles) {
        if (!attachmentSettings.allowedMimeTypes.includes(file.type)) {
          return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
        }
        if (file.size > attachmentSettings.maxSizePerFileBytes) {
          return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
        }
      }
    }

    const { data: categories, error: categoryError } = await supabase
      .from('board_categories')
      .select('id, category_key')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (categoryError || !categories || categories.length === 0) {
      logError('board.post.api.category_error', {
        tenantId,
      });
      return NextResponse.json({ errorCode: 'category_not_found' }, { status: 400 });
    }

    const category = categories.find((c) => c.category_key === categoryKey);
    if (!category) {
      return NextResponse.json({ errorCode: 'invalid_category' }, { status: 400 });
    }

    const { data: tenantSettingsRows } = await supabase
      .from('tenant_settings')
      .select('config_json')
      .eq('tenant_id', tenantId)
      .limit(1);

    const rawConfigValue = tenantSettingsRows?.[0]?.config_json as unknown;
    let config: any = {};

    if (typeof rawConfigValue === 'string') {
      try {
        config = JSON.parse(rawConfigValue) as any;
      } catch {
        config = {};
      }
    } else if (typeof rawConfigValue === 'object' && rawConfigValue !== null) {
      config = rawConfigValue;
    }

    let boardSection: any = config.board;
    if (typeof boardSection === 'string') {
      try {
        boardSection = JSON.parse(boardSection) as any;
      } catch {
        boardSection = {};
      }
    }

    const rawModeration = (boardSection?.moderation ?? null) as unknown;
    let boardModeration: { enabled?: boolean; level?: unknown } = {};

    if (typeof rawModeration === 'string') {
      try {
        const parsed = JSON.parse(rawModeration) as { enabled?: boolean; level?: unknown };
        boardModeration = parsed ?? {};
      } catch {
        boardModeration = {};
      }
    } else if (typeof rawModeration === 'object' && rawModeration !== null) {
      boardModeration = rawModeration as { enabled?: boolean; level?: unknown };
    }

    const levelRaw = boardModeration.level;
    const levelNumber =
      typeof levelRaw === 'string'
        ? Number(levelRaw)
        : typeof levelRaw === 'number'
          ? levelRaw
          : 0;
    const normalizedLevel: 0 | 1 | 2 = levelNumber === 1 ? 1 : levelNumber === 2 ? 2 : 0;

    const tenantModerationConfig: TenantModerationConfig = {
      enabled: boardModeration.enabled ?? true,
      level: normalizedLevel,
    };

    const moderationInput = [`Title: ${title}`, '', content].join('\n');
    const moderationResult = await callOpenAiModeration(moderationInput);
    const { decision: baseDecision, aiScore, flaggedReason } = decideModeration(
      moderationResult,
      tenantModerationConfig,
    );

    const hasLocalSensitive = maskSensitiveText(moderationInput) !== moderationInput;
    let decision = baseDecision;

    if (hasLocalSensitive) {
      if (tenantModerationConfig.level === 1) {
        decision = 'mask';
      } else if (tenantModerationConfig.level === 2) {
        decision = 'block';
      }
    }

    logInfo('board.post.moderation_decision', {
      tenantId,
      level: tenantModerationConfig.level,
      enabled: tenantModerationConfig.enabled,
      hasLocalSensitive,
      baseDecision,
      finalDecision: decision,
      aiScore,
      flaggedReason,
    });

    let maskedTitle: string | undefined;
    let maskedContent: string | undefined;

    if (decision === 'mask') {
      maskedTitle = maskSensitiveText(title);
      maskedContent = maskSensitiveText(content);
    }

    if (decision === 'block') {
      await saveModerationLog({
        tenantId,
        contentType: 'board_post',
        contentId: 'pending',
        decision,
        aiScore,
        flaggedReason,
      });
      return NextResponse.json({ errorCode: 'ai_moderation_blocked' }, { status: 400 });
    }

    if (decision === 'mask' && !forceMasked) {
      await saveModerationLog({
        tenantId,
        contentType: 'board_post',
        contentId: 'pending',
        decision,
        aiScore,
        flaggedReason,
      });

      return NextResponse.json(
        {
          errorCode: 'ai_moderation_masked',
          maskedTitle: maskedTitle ?? title,
          maskedContent: maskedContent ?? content,
        },
        { status: 400 },
      );
    }

    const effectiveTitle = decision === 'mask' && forceMasked ? maskedTitle ?? title : title;
    const effectiveContent =
      decision === 'mask' && forceMasked ? maskedContent ?? content : content;

    let authorDisplayNameOverride: string | null = null;
    // 管理組合として投稿する場合は常に「管理組合」を表示名として扱う。
    if (authorRole === 'admin') {
      authorDisplayNameOverride = '管理組合';
    } else if (displayNameMode === 'anonymous') {
      // 一般利用者で「匿名」を選択した場合のみ、固定文言を上書きする。
      authorDisplayNameOverride = '匿名';
    }

    const isManagementPost = authorRole === 'admin';
    const initialStatus: 'pending' | 'published' = isManagementPost ? 'pending' : 'published';

    let postId: string;

    try {
      const insertResult = await prisma.board_posts.create({
        data: {
          tenant_id: tenantId,
          category_id: category.id,
          author_id: authorId,
          title: effectiveTitle,
          content: effectiveContent,
          // 管理組合投稿は承認フローを経るため、初期状態は pending とし、
          // 一般投稿のみ即時 published とする。
          status: initialStatus,
          author_display_name: authorDisplayNameOverride,
          author_role: authorRole === 'admin' ? 'management' : 'general',
        } as any,
        select: {
          id: true,
        },
      });

      postId = insertResult.id;
    } catch (error) {
      logError('board.post.api.insert_error', {
        tenantId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ errorCode: 'insert_failed' }, { status: 500 });
    }

    if (attachmentFiles.length > 0) {
      const serviceRoleSupabase = createSupabaseServiceRoleClient();
      const storageBucket = serviceRoleSupabase.storage.from('board-attachments');

      try {
        for (const file of attachmentFiles) {
          const originalName = file.name || 'attachment.pdf';
          const ext = (originalName.split('.').pop() ?? 'pdf').toLowerCase() || 'pdf';
          const objectPath = `tenant-${tenantId}/post-${postId}/${randomUUID()}.${ext}`;

          const { error: uploadError } = await storageBucket.upload(objectPath, file, {
            contentType: file.type,
          });

          if (uploadError) {
            throw new Error(uploadError.message);
          }

          await prisma.board_attachments.create({
            data: {
              tenant_id: tenantId,
              post_id: postId,
              file_url: objectPath,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
            },
          });
        }
      } catch (error) {
        logError('board.post.api.attachment_error', {
          tenantId,
          postId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        try {
          await prisma.board_attachments.deleteMany({
            where: {
              tenant_id: tenantId,
              post_id: postId,
            },
          });

          await prisma.board_posts.delete({
            where: {
              id: postId,
            },
          });
        } catch (cleanupError) {
          logError('board.post.api.attachment_cleanup_error', {
            tenantId,
            postId,
            errorMessage:
              cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          });
        }

        return NextResponse.json({ errorCode: 'attachment_upload_failed' }, { status: 500 });
      }
    }

    await saveModerationLog({
      tenantId,
      contentType: 'board_post',
      contentId: postId,
      decision,
      aiScore,
      flaggedReason,
    });

    try {
      const translationService = new GoogleTranslationService();
      // 翻訳キャッシュは service_role クライアントを用いて RLS ポリシー（*_service）に沿って書き込む。
      const serviceRoleSupabase = createSupabaseServiceRoleClient();
      const boardTranslation = new BoardPostTranslationService({
        supabase: serviceRoleSupabase,
        translationService,
      });
      const preferredUiLanguage: SupportedLang = uiLanguage === 'en' || uiLanguage === 'zh' ? uiLanguage : 'ja';

      const textForDetect = [effectiveTitle, effectiveContent].join('\n\n');

      let sourceLang: SupportedLang = preferredUiLanguage;

      const detected = await translationService.detectLanguageOnce(textForDetect);
      if (detected) {
        sourceLang = detected;
      }

      const allLangs: SupportedLang[] = ['ja', 'en', 'zh'];
      const targetLangs = allLangs.filter((lang) => lang !== sourceLang) as SupportedLang[];

      await boardTranslation.translateAndCacheForPost({
        tenantId,
        postId,
        sourceLang,
        targetLangs,
        originalTitle: effectiveTitle,
        originalBody: effectiveContent,
      });
    } catch (error) {
      logError('board.post.api.translation_error', {
        tenantId,
        postId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }

    // 通知メールは「公開済み」となったタイミングで送る。
    // 一般投稿は作成時点で published となるためここで送信し、
    // 管理組合投稿は承認フロー完了後の publish API 側で送信する。
    if (initialStatus === 'published') {
      try {
        await sendBoardNotificationEmailsForPost({
          tenantId,
          postId,
        });
      } catch (error) {
        logError('board.post.api.notification_error', {
          tenantId,
          postId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logInfo('board.post.create_success', {
      tenantId,
      postId,
      categoryKey,
    });

    return NextResponse.json({ postId }, { status: 201 });
  } catch (error) {
    logError('board.post.api.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
