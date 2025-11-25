export type TtsEngine = "gcp" | "dummy";

export type TtsVoiceSettings = {
  engine: TtsEngine;
  languageCode: string; // 例: "ja-JP", "en-US"
  voiceName: string; // 例: "ja-JP-Standard-A"
  speakingRate: number; // 0.25〜4.0
};

export type TenantTtsSettings = {
  default: TtsVoiceSettings;
};

const DEFAULT_TTS_SETTINGS: TenantTtsSettings = {
  default: {
    engine: "gcp",
    languageCode: "ja-JP",
    voiceName: "ja-JP-Standard-A",
    speakingRate: 1.0,
  },
};

export async function getTenantTtsSettings(_tenantId: string): Promise<TenantTtsSettings> {
  // 将来ここで tenant_settings テーブルなどから TTS 設定を取得する。
  // 現時点では、すべてのテナントで DEFAULT_TTS_SETTINGS を返す。
  return DEFAULT_TTS_SETTINGS;
}
