import { NextRequest, NextResponse } from "next/server";
import { getSystemAdminApiContext, SystemAdminApiError } from "@/src/lib/auth/systemAdminAuth";
import { logError } from '@/src/lib/logging/log.util';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { adminClient } = await getSystemAdminApiContext();

    const url = new URL(request.url);
    const langParam = url.searchParams.get("lang");
    const lang = langParam === "en" || langParam === "zh" ? langParam : "ja";

    const { data, error } = await adminClient
      .from("static_translation_defaults")
      .select("message_key, text_ja, text_en, text_zh")
      .eq("screen_key", "sys_admin_tenants");

    if (error || !Array.isArray(data)) {
      logError('sys-admin.tenants.translations.read_failed', {
        reason: (error as any)?.message ?? 'unknown',
      });
      return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
    }

    const messages: Record<string, string> = {};

    for (const row of data as {
      message_key: string | null;
      text_ja: string | null;
      text_en: string | null;
      text_zh: string | null;
    }[]) {
      const key = row.message_key ?? "";
      if (!key) continue;

      const textJa = (row.text_ja ?? "").trim();
      const textEn = (row.text_en ?? "").trim();
      const textZh = (row.text_zh ?? "").trim();

      if (lang === "en") {
        messages[key] = textEn && textEn !== key ? textEn : "";
      } else if (lang === "zh") {
        messages[key] = textZh && textZh !== key ? textZh : "";
      } else {
        messages[key] = textJa && textJa !== key ? textJa : "";
      }
    }

    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof SystemAdminApiError) {
      return NextResponse.json({ errorCode: error.code }, { status: error.status });
    }

    logError('sys-admin.tenants.translations.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}
