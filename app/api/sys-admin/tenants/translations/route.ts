import { NextRequest, NextResponse } from "next/server";
import { getSystemAdminApiContext, SystemAdminApiError } from "@/src/lib/auth/systemAdminAuth";

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
      console.error(
        "[sys-admin][tenants][translations] Failed to read static_translation_defaults",
        error,
      );
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
        messages[key] = textEn || textJa || key;
      } else if (lang === "zh") {
        messages[key] = textZh || textJa || key;
      } else {
        messages[key] = textJa || key;
      }
    }

    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof SystemAdminApiError) {
      return NextResponse.json({ errorCode: error.code }, { status: error.status });
    }

    console.error("[sys-admin][tenants][translations] Unexpected error", error);
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}
