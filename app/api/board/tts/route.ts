import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { getTenantTtsSettings } from "@/src/lib/ttsSettings";
import { BoardPostTtsService } from "@/src/server/services/tts/BoardPostTtsService";
import { GoogleTtsService } from "@/src/server/services/tts/GoogleTtsService";
import type { SupportedLang } from "@/src/server/services/translation/GoogleTranslationService";

interface BoardTtsRequestBody {
  tenantId?: string; // クライアントから送られてきてもサーバ側判定を優先
  postId?: string;
  language?: string; // 例: "ja-JP", "en-US", "zh-CN"
  text: string;
}

const MIN_TEXT_LENGTH = 5;
// リクエスト全体としての最大バイト数（UTF-8）。Google TTS の 5000 bytes 制限は
// BoardPostTtsService 側でチャンク分割して回避するため、ここでは安全側に大きめに取る。
const MAX_TOTAL_TEXT_BYTES = 20000;

const mapLanguageToSupportedLang = (language?: string): SupportedLang => {
  if (!language) return "ja";

  const lower = language.toLowerCase();
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("zh")) return "zh";
  return "ja";
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError("board.tts.api.auth_error", {
        reason: authError?.message ?? "no_session",
      });
      return NextResponse.json({ errorCode: "auth_error" }, { status: 401 });
    }

    const body = (await req.json()) as BoardTtsRequestBody;
    const rawText = body.text ?? "";
    const text = typeof rawText === "string" ? rawText.trim() : "";

    if (!text || text.length < MIN_TEXT_LENGTH) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    const totalBytes = Buffer.byteLength(text, "utf8");
    if (totalBytes > MAX_TOTAL_TEXT_BYTES) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    const email = user.email;

    const {
      data: appUser,
      error: appUserError,
    } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (appUserError || !appUser) {
      logError("board.tts.api.user_not_found", {
        email,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", appUser.id)
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      logError("board.tts.api.membership_error", {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const tenantId = membership.tenant_id as string;
    const requestedLang = mapLanguageToSupportedLang(body.language);

    const ttsSettings = await getTenantTtsSettings(tenantId);
    const settingsLang = mapLanguageToSupportedLang(ttsSettings.default.languageCode);
    const effectiveLang: SupportedLang = requestedLang ?? settingsLang;

    const ttsService = new GoogleTtsService();
    const boardTtsService = new BoardPostTtsService({ ttsService });

    const result = await boardTtsService.synthesizePostBody({
      tenantId,
      postId: body.postId ?? "unknown",
      lang: effectiveLang,
      text,
    });

    const audioBuffer = Buffer.from(result.audioBuffer);

    logInfo("board.tts.api.success", {
      tenantId,
      postId: body.postId ?? null,
      lang: effectiveLang,
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logError("board.tts.api.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "tts_failed" }, { status: 500 });
  }
}
