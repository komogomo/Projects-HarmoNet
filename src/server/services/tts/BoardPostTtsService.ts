import type { TtsService, TtsResult } from './GoogleTtsService';
import type { SupportedLang } from '../translation/GoogleTranslationService';

export interface BoardPostTtsServiceDeps {
  ttsService: TtsService;
}

// Google Cloud Text-to-Speech の input.text 上限は「5000 bytes」なので、
// 多少の余裕を見て 4800 bytes ごとに分割して合成する。
const GOOGLE_TTS_SAFE_BYTE_LIMIT = 4800;

function splitTextByUtf8Bytes(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const char of text) {
    const next = current + char;
    const byteLength = Buffer.byteLength(next, 'utf8');

    if (byteLength > maxBytes) {
      if (current.length > 0) {
        chunks.push(current);
        current = char;
      } else {
        // 単一文字でさえ上限を超えるケースはほぼ無いが、安全のためそのまま区切る
        chunks.push(char);
        current = '';
      }
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export class BoardPostTtsService {
  private readonly ttsService: TtsService;

  constructor(deps: BoardPostTtsServiceDeps) {
    this.ttsService = deps.ttsService;
  }

  async synthesizePostBody(params: {
    tenantId: string;
    postId: string;
    lang: SupportedLang;
    text: string;
  }): Promise<TtsResult> {
    const { tenantId, lang, text } = params;

    const chunks = splitTextByUtf8Bytes(text, GOOGLE_TTS_SAFE_BYTE_LIMIT);

    if (chunks.length === 1) {
      return this.ttsService.synthesize({
        tenantId,
        lang,
        text: chunks[0],
      });
    }

    const results: TtsResult[] = [];
    for (const chunk of chunks) {
      // 順次合成（シンプルさ優先）。必要なら将来並列化も検討する。
      // eslint-disable-next-line no-await-in-loop
      const result = await this.ttsService.synthesize({
        tenantId,
        lang,
        text: chunk,
      });
      results.push(result);
    }

    // 結果の音声バッファ（MP3）を単純連結する。
    const buffers = results.map((r) => Buffer.from(r.audioBuffer));
    const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
    const merged = Buffer.concat(buffers, totalLength);

    const audioBuffer = merged.buffer.slice(
      merged.byteOffset,
      merged.byteOffset + merged.byteLength,
    ) as ArrayBuffer;

    return {
      audioBuffer,
      mimeType: results[0]?.mimeType ?? 'audio/mpeg',
    };
  }
}
