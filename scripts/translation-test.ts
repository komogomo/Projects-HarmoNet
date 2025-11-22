// scripts/translation-test.ts
import { TranslationServiceClient } from '@google-cloud/translate';

// .env.local で設定した値をそのまま使う想定
const projectId = process.env.GCP_PROJECT_ID;
const location = 'global'; // 必要なら asia-northeast1 等に変更

async function main() {
  if (!projectId) {
    console.error('GCP_PROJECT_ID が設定されていません');
    process.exit(1);
  }

  // B-04 ch02 v1.1 と同じ方針:
  // 本番は GCP_TRANSLATE_CREDENTIALS_JSON、ローカルは GOOGLE_APPLICATION_CREDENTIALS
  const credentialsJson = process.env.GCP_TRANSLATE_CREDENTIALS_JSON;

  const client = credentialsJson
    ? new TranslationServiceClient({
        projectId,
        credentials: JSON.parse(credentialsJson),
      })
    : new TranslationServiceClient(); // ローカル: GOOGLE_APPLICATION_CREDENTIALS を利用

  const text = 'こんにちは、HarmoNet の翻訳テストです。';
  const sourceLang = 'ja';
  const targetLang = 'en';

  console.log('==== Translation API テスト開始 ====');
  console.log('projectId:', projectId);
  console.log('text:', text);
  console.log('sourceLang:', sourceLang, '→ targetLang:', targetLang);

  const [response] = await client.translateText({
    parent: `projects/${projectId}/locations/${location}`,
    contents: [text],
    mimeType: 'text/plain',
    sourceLanguageCode: sourceLang,
    targetLanguageCode: targetLang,
  });

  const translated = response.translations?.[0]?.translatedText;
  console.log('translatedText:', translated);
  console.log('==== Translation API テスト終了 ====');
}

main().catch((err) => {
  console.error('Translation API 呼び出しでエラー:', err);
  process.exit(1);
});
