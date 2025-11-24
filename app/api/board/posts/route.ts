import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';
import { callOpenAiModeration, decideModeration, maskSensitiveText, saveModerationLog, type TenantModerationConfig } from '@/src/server/services/moderationService';
import { BoardPostTranslationService } from '@/src/server/services/translation/BoardPostTranslationService';
import { GoogleTranslationService } from '@/src/server/services/translation/GoogleTranslationService';

interface UpsertBoardPostRequest {
  tenantId: string;
  authorId: string;
  authorRole: 'admin' | 'user';
  displayNameMode: 'anonymous' | 'nickname';
  categoryKey: string;
  title: string;
  content: string;
   forceMasked?: boolean;
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

    const body = (await req.json()) as UpsertBoardPostRequest;
    const { tenantId: tenantIdFromBody, authorId, categoryKey, title, content, forceMasked = false } = body;

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
      .eq('status', 'active')
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
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      logError('board.post.api.membership_error', {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
    }

    const tenantId = membership.tenant_id as string;

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
    const effectiveContent = decision === 'mask' && forceMasked ? maskedContent ?? content : content;

    let postId: string;

    try {
      const insertResult = await prisma.board_posts.create({
        data: {
          tenant_id: tenantId,
          category_id: category.id,
          author_id: authorId,
          title: effectiveTitle,
          content: effectiveContent,
          status: 'published',
        },
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
      const boardTranslation = new BoardPostTranslationService({
        supabase,
        translationService,
      });

      await boardTranslation.translateAndCacheForPost({
        tenantId,
        postId,
        sourceLang: 'ja',
        targetLangs: ['ja', 'en', 'zh'],
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
