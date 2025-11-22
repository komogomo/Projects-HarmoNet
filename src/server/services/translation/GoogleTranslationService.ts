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
      const request = {
        parent: `projects/${this.projectId}/locations/${this.location}`,
        contents: [text],
        mimeType: 'text/plain',
        sourceLanguageCode: sourceLang,
        targetLanguageCode: targetLang,
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
}
