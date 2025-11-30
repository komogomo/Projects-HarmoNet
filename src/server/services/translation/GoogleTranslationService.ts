import { TranslationServiceClient } from '@google-cloud/translate';
import { logInfo, logError } from '@/src/lib/logging/log.util';

export type SupportedLang = 'ja' | 'en' | 'zh';

export interface TranslateParams {
  tenantId: string;
  sourceLang: SupportedLang;
  targetLang: SupportedLang;
  text: string;
}

export interface TranslateResult {
  text: string;
}

export interface TranslationService {
  translateOnce(params: TranslateParams): Promise<TranslateResult>;
}

export class GoogleTranslationService implements TranslationService {
  private readonly projectId: string;
  private readonly client: TranslationServiceClient;
  private readonly location = 'global';

  constructor() {
    const projectId = process.env.GCP_PROJECT_ID;
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID is not set');
    }
    this.projectId = projectId;

    const credentialsJson = process.env.GCP_TRANSLATE_CREDENTIALS_JSON;
    if (credentialsJson) {
      const credentials = JSON.parse(credentialsJson);
      this.client = new TranslationServiceClient({
        projectId: this.projectId,
        credentials,
      });
    } else {
      this.client = new TranslationServiceClient();
    }
  }

  async translateOnce(params: TranslateParams): Promise<TranslateResult> {
    const { tenantId, sourceLang, targetLang, text } = params;
    const startedAt = Date.now();

    try {
      const normalizeLangCode = (lang: SupportedLang): string => {
        if (lang === 'zh') {
          // 簡体字中国語として扱う
          return 'zh-CN';
        }
        return lang;
      };

      const request = {
        parent: `projects/${this.projectId}/locations/${this.location}`,
        contents: [text],
        mimeType: 'text/plain',
        sourceLanguageCode: normalizeLangCode(sourceLang),
        targetLanguageCode: normalizeLangCode(targetLang),
      };

      const [response] = await this.client.translateText(request as any, {
        timeout: 3000,
      } as any);
      const translated = response.translations?.[0]?.translatedText ?? '';

      const durationMs = Date.now() - startedAt;
      logInfo('board.translation.success', {
        tenantId,
        sourceLang,
        targetLang,
        durationMs,
      });

      return { text: translated };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      logError('board.translation.error', {
        tenantId,
        sourceLang,
        targetLang,
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs,
      });
      throw error;
    }
  }

  async detectLanguageOnce(text: string): Promise<SupportedLang | null> {
    const startedAt = Date.now();

    try {
      const request = {
        parent: `projects/${this.projectId}/locations/${this.location}`,
        content: text,
        mimeType: 'text/plain',
      };

      const [response] = await this.client.detectLanguage(request as any, {
        timeout: 3000,
      } as any);

      const rawCode = response.languages?.[0]?.languageCode?.toLowerCase();

      // zh, zh-cn, zh-hans などは内部的に 'zh' として扱う
      const code =
        rawCode === 'zh' || rawCode === 'zh-cn' || rawCode === 'zh-hans'
          ? 'zh'
          : rawCode;

      const durationMs = Date.now() - startedAt;

      if (code === 'ja' || code === 'en' || code === 'zh') {
        logInfo('board.translation.detect.success', {
          detectedLang: code,
          durationMs,
        });
        return code as SupportedLang;
      }

      logInfo('board.translation.detect.unsupported', {
        detectedLang: code ?? 'unknown',
        durationMs,
      });

      return null;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      logError('board.translation.detect.error', {
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs,
      });
      return null;
    }
  }
}
