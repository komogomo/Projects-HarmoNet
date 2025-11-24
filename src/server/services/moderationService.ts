import { logError, logInfo } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

export type ModerationDecision = 'allow' | 'mask' | 'block';

export interface TenantModerationConfig {
  enabled: boolean;
  level: 0 | 1 | 2;
}

export interface OpenAiModerationCategoryScores {
  [key: string]: number;
}

export interface OpenAiModerationResult {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    category_scores: OpenAiModerationCategoryScores;
  }>;
}

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/moderations';
const OPENAI_MODEL = 'omni-moderation-latest';

const T_LOW = 0.40;
const T_HIGH = 0.60;

export async function callOpenAiModeration(input: string): Promise<OpenAiModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OpenAI moderation failed: ${response.status} ${text}`);
    }

    const json = (await response.json()) as OpenAiModerationResult;

    const durationMs = Date.now() - startedAt;
    logInfo('moderation.openai.success', {
      model: OPENAI_MODEL,
      durationMs,
    });

    return json;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logError('moderation.openai.error', {
      model: OPENAI_MODEL,
      durationMs,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function decideModeration(
  result: OpenAiModerationResult,
  tenantConfig: TenantModerationConfig,
): {
  decision: ModerationDecision;
  aiScore: number;
  flaggedReason: string;
} {
  if (!tenantConfig.enabled || tenantConfig.level === 0) {
    return {
      decision: 'allow',
      aiScore: 0,
      flaggedReason: '',
    };
  }

  const first = result.results[0];
  if (!first) {
    return {
      decision: 'allow',
      aiScore: 0,
      flaggedReason: '',
    };
  }

  const scores = first.category_scores ?? {};
  let maxKey = '';
  let maxScore = 0;

  for (const [key, value] of Object.entries(scores)) {
    if (typeof value === 'number' && value > maxScore) {
      maxScore = value;
      maxKey = key;
    }
  }

  // スコアからおおまかなリスクレベルも算出しておく（ログや将来拡張用）
  let riskLevel: 'low' | 'medium' | 'high';
  if (maxScore < T_LOW) {
    riskLevel = 'low';
  } else if (maxScore < T_HIGH) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  const flagged = first.flagged === true;

  let decision: ModerationDecision = 'allow';

  if (tenantConfig.level === 1) {
    // レベル1: OpenAI が flagged=true と判定したものは必ず mask
    decision = flagged ? 'mask' : 'allow';
  } else if (tenantConfig.level === 2) {
    // レベル2: OpenAI が flagged=true と判定したものは必ず block
    decision = flagged ? 'block' : 'allow';
  }

  return {
    decision,
    aiScore: maxScore,
    flaggedReason: maxKey,
  };
}

const SENSITIVE_PATTERNS: RegExp[] = [
  /死ね/g,
  /殺す/g,
  /バカ/g,
  /馬鹿/g,
  /バカ野郎/g,
  /馬鹿野郎/g,
  /クソ/g,
  /クソ野郎/g,
  /セックス/g,
  /まんこ/g,
  /ちんこ/g,
  /ちんちん/g,
  /fuck/gi,
  /shit/gi,
];

export function maskSensitiveText(text: string): string {
  if (!text) {
    return text;
  }

  let masked = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    masked = masked.replace(pattern, (match) => '*'.repeat(match.length));
  }
  return masked;
}

export async function saveModerationLog(params: {
  tenantId: string;
  contentType: 'board_post' | 'board_comment';
  contentId: string;
  decision: ModerationDecision;
  aiScore: number;
  flaggedReason: string;
}): Promise<void> {
  const { tenantId, contentType, contentId, decision, aiScore, flaggedReason } = params;

  try {
    await prisma.moderation_logs.create({
      data: {
        tenant_id: tenantId,
        content_type: contentType,
        content_id: contentId,
        decision,
        ai_score: aiScore,
        flagged_reason: flaggedReason,
      },
    });
  } catch (error) {
    logError('moderation.log.save_error', {
      tenantId,
      contentType,
      contentId,
      decision,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}
