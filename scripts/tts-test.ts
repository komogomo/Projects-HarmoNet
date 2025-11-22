import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
import textToSpeech from '@google-cloud/text-to-speech';

dotenvConfig({
  path: path.resolve(process.cwd(), '.env.local'),
});

const projectId = process.env.GCP_PROJECT_ID;

async function main() {
  if (!projectId) {
    console.error('GCP_PROJECT_ID が設定されていません');
    process.exit(1);
  }

  const credentialsJson = process.env.GCP_TRANSLATE_CREDENTIALS_JSON;

  const client = credentialsJson
    ? new textToSpeech.TextToSpeechClient({
        projectId,
        credentials: JSON.parse(credentialsJson),
      })
    : new textToSpeech.TextToSpeechClient(); // ローカルは GOOGLE_APPLICATION_CREDENTIALS を利用

  const text = 'こんにちは、HarmoNet の音声読み上げテストです。';

  console.log('==== TTS API テスト開始 ====');
  console.log('projectId:', projectId);
  console.log('text:', text);

  const request = {
    input: { text },
    voice: {
      languageCode: 'ja-JP',
      ssmlGender: 'NEUTRAL' as const,
    },
    audioConfig: {
      audioEncoding: 'MP3' as const,
    },
  };

  const [response] = await client.synthesizeSpeech(request as any);

  if (!response.audioContent) {
    console.error('audioContent が空です');
    process.exit(1);
  }

  const outPath = path.resolve(process.cwd(), 'scripts', 'tts-test-output.mp3');
  fs.writeFileSync(outPath, response.audioContent as Buffer);

  console.log('音声ファイルを出力しました:', outPath);
  console.log('==== TTS API テスト終了 ====');
}

main().catch((err) => {
  console.error('TTS API 呼び出しでエラー:', err);
  process.exit(1);
});
