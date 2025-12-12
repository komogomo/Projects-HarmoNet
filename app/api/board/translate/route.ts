import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';
import { BoardPostTranslationService } from '@/src/server/services/translation/BoardPostTranslationService';
import { GoogleTranslationService, type SupportedLang } from '@/src/server/services/translation/GoogleTranslationService';

interface TranslateRequest {
    postId: string;
    targetLang: SupportedLang;
}

export async function POST(req: Request) {
    const supabase = await createSupabaseServerClient();

    try {
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user || !user.email) {
            logError('board.translate.api.auth_error', {
                reason: authError?.message ?? 'no_session',
            });
            return NextResponse.json({ errorCode: 'auth_error' }, { status: 401 });
        }

        const body = (await req.json()) as TranslateRequest;
        const { postId, targetLang } = body;

        if (!postId || !targetLang) {
            return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
        }

        if (!['ja', 'en', 'zh'].includes(targetLang)) {
            return NextResponse.json({ errorCode: 'invalid_language' }, { status: 400 });
        }

        // Fetch the post to verify existence and get tenantId/content
        const post = await prisma.board_posts.findUnique({
            where: { id: postId },
            select: {
                id: true,
                tenant_id: true,
                title: true,
                content: true,
            },
        });

        if (!post) {
            return NextResponse.json({ errorCode: 'post_not_found' }, { status: 404 });
        }

        const tenantId = post.tenant_id;

        // Get app user
        const {
            data: appUser,
            error: appUserError,
        } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();

        if (appUserError || !appUser) {
            logError('board.translate.api.user_not_found', {
                userId: user.id,
            });
            return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
        }

        // Verify user belongs to the tenant
        const { data: membership, error: membershipError } = await supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', appUser.id)
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (membershipError || !membership) {
            logError('board.translate.api.membership_error', {
                userId: appUser.id,
                tenantId,
            });
            return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
        }

        // Initialize services
        const translationService = new GoogleTranslationService();
        const serviceRoleSupabase = createSupabaseServiceRoleClient();
        const boardTranslation = new BoardPostTranslationService({
            supabase: serviceRoleSupabase,
            translationService,
        });

        // Detect source language
        const textForDetect = [post.title, post.content].join('\n\n');
        let sourceLang: SupportedLang = 'ja'; // Default
        const detected = await translationService.detectLanguageOnce(textForDetect);
        if (detected) {
            sourceLang = detected;
        }

        // Execute translation
        await boardTranslation.translateAndCacheForPost({
            tenantId,
            postId,
            sourceLang,
            targetLangs: [targetLang],
            originalTitle: post.title,
            originalBody: post.content,
        });

        // Fetch the translated result
        const translation = await prisma.board_post_translations.findUnique({
            where: {
                post_id_lang: {
                    post_id: postId,
                    lang: targetLang,
                },
            },
            select: {
                title: true,
                content: true,
            },
        });

        if (!translation) {
            throw new Error('Translation failed to save');
        }

        logInfo('board.translate.api.success', {
            tenantId,
            postId,
            targetLang,
        });

        return NextResponse.json({
            title: translation.title,
            content: translation.content,
        });

    } catch (error) {
        logError('board.translate.api.unexpected_error', {
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
    }
}
