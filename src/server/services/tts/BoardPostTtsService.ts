import type { TtsService, TtsResult } from './GoogleTtsService';
import type { SupportedLang } from '../translation/GoogleTranslationService';

export interface BoardPostTtsServiceDeps {
  ttsService: TtsService;
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

    return this.ttsService.synthesize({
      tenantId,
      lang,
      text,
    });
  }
}
