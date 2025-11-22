import textToSpeech from '@google-cloud/text-to-speech';
import { logInfo, logError } from '@/src/lib/logging/log.util';
import type { SupportedLang } from '../translation/GoogleTranslationService';

export interface TtsParams {
  tenantId: string;
  lang: SupportedLang;
  text: string;
}

export interface TtsResult {
  audioBuffer: ArrayBuffer;
  mimeType: string;
}

export interface TtsService {
  synthesize(params: TtsParams): Promise<TtsResult>;
}

const mapLangToGoogleCode = (lang: SupportedLang): string => {
  switch (lang) {
    case 'ja':
      return 'ja-JP';
    case 'en':
      return 'en-US';
    case 'zh':
      return 'cmn-CN';
  }
};

export class GoogleTtsService implements TtsService {
  private readonly projectId: string;
  // NOTE: 型定義が複雑なため、クライアント型は any として扱う（実体は TextToSpeechClient）。
  private readonly client: any;

  constructor() {
    const projectId = process.env.GCP_PROJECT_ID;
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID is not set');
    }
    this.projectId = projectId;

    const credentialsJson = process.env.GCP_TRANSLATE_CREDENTIALS_JSON;
    if (credentialsJson) {
      const credentials = JSON.parse(credentialsJson);
      this.client = new textToSpeech.TextToSpeechClient({
        projectId: this.projectId,
        credentials,
      });
    } else {
      this.client = new textToSpeech.TextToSpeechClient();
    }
  }

  async synthesize(params: TtsParams): Promise<TtsResult> {
    const { tenantId, lang, text } = params;
    const startedAt = Date.now();

    try {
      const languageCode = mapLangToGoogleCode(lang);

      const request = {
        input: { text },
        voice: {
          languageCode,
          ssmlGender: 'NEUTRAL' as const,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
        },
      };

      const [response] = await this.client.synthesizeSpeech(request as any, {
        timeout: 3000,
      } as any);

      const audioContent = response.audioContent;
      if (!audioContent) {
        throw new Error('TTS audioContent is empty');
      }

      const buffer = audioContent as Buffer;
      const audioSizeBytes = buffer.length;
      const audioBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;

      const durationMs = Date.now() - startedAt;
      logInfo('board.tts.success', {
        tenantId,
        lang,
        durationMs,
        audioSizeBytes,
      });

      return {
        audioBuffer,
        mimeType: 'audio/mpeg',
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      logError('board.tts.error', {
        tenantId,
        lang,
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs,
      });
      throw error;
    }
  }
}
