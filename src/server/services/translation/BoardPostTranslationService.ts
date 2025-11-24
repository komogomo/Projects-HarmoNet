import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@/src/lib/logging/log.util';
import type { TranslationService, SupportedLang } from './GoogleTranslationService';

export interface BoardPostTranslationServiceDeps {
  supabase: SupabaseClient;
  translationService: TranslationService;
}

export class BoardPostTranslationService {
  private readonly supabase: SupabaseClient;
  private readonly translationService: TranslationService;

  constructor(deps: BoardPostTranslationServiceDeps) {
    this.supabase = deps.supabase;
    this.translationService = deps.translationService;
  }

  async hasCachedTranslation(params: {
    tenantId: string;
    postId: string;
    lang: SupportedLang;
  }): Promise<boolean> {
    const { tenantId, postId, lang } = params;

    const { data, error } = await this.supabase
      .from('board_post_translations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('post_id', postId)
      .eq('lang', lang)
      .limit(1);

    if (error) {
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  }

  async translateAndCacheForPost(params: {
    tenantId: string;
    postId: string;
    sourceLang: SupportedLang;
    targetLangs: SupportedLang[];
    originalTitle?: string;
    originalBody: string;
  }): Promise<void> {
    const { tenantId, postId, sourceLang, targetLangs, originalTitle, originalBody } = params;

    const tasks = targetLangs
      .filter((targetLang) => targetLang !== sourceLang)
      .map(async (targetLang) => {
        let translatedTitle: string | null = null;

        if (originalTitle && originalTitle.trim().length > 0) {
          try {
            const titleResult = await this.translationService.translateOnce({
              tenantId,
              sourceLang,
              targetLang,
              text: originalTitle,
            });

            translatedTitle = titleResult.text || null;
          } catch {
            translatedTitle = null;
          }
        }

        try {
          const bodyResult = await this.translationService.translateOnce({
            tenantId,
            sourceLang,
            targetLang,
            text: originalBody,
          });

          const { error } = await this.supabase
            .from('board_post_translations')
            .upsert(
              {
                tenant_id: tenantId,
                post_id: postId,
                lang: targetLang,
                title: translatedTitle,
                content: bodyResult.text,
              },
              { onConflict: 'post_id,lang' },
            );

          if (error) {
            logError('board.translation.cache_error.post', {
              tenantId,
              postId,
              targetLang,
              errorMessage: error.message ?? String(error),
            });
          }
        } catch (error) {
          // フェイルソフト: 単一言語での失敗は握りつぶし、他言語は継続する。
          logError('board.translation.cache_exception.post', {
            tenantId,
            postId,
            targetLang,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }
      });

    await Promise.all(tasks);
  }

  async hasCachedCommentTranslation(params: {
    tenantId: string;
    commentId: string;
    lang: SupportedLang;
  }): Promise<boolean> {
    const { tenantId, commentId, lang } = params;

    const { data, error } = await this.supabase
      .from('board_comment_translations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('comment_id', commentId)
      .eq('lang', lang)
      .limit(1);

    if (error) {
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  }

  async translateAndCacheForComment(params: {
    tenantId: string;
    commentId: string;
    sourceLang: SupportedLang;
    targetLangs: SupportedLang[];
    originalBody: string;
  }): Promise<void> {
    const { tenantId, commentId, sourceLang, targetLangs, originalBody } = params;

    const tasks = targetLangs
      .filter((targetLang) => targetLang !== sourceLang)
      .map(async (targetLang) => {
        try {
          const result = await this.translationService.translateOnce({
            tenantId,
            sourceLang,
            targetLang,
            text: originalBody,
          });

          const { error } = await this.supabase
            .from('board_comment_translations')
            .upsert(
              {
                tenant_id: tenantId,
                comment_id: commentId,
                lang: targetLang,
                content: result.text,
              },
              { onConflict: 'comment_id,lang' },
            );

          if (error) {
            logError('board.translation.cache_error.comment', {
              tenantId,
              commentId,
              targetLang,
              errorMessage: error.message ?? String(error),
            });
          }
        } catch (error) {
          logError('board.translation.cache_exception.comment', {
            tenantId,
            commentId,
            targetLang,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }
      });

    await Promise.all(tasks);
  }
}
