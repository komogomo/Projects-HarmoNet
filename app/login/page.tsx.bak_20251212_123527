import React from "react";
import { redirect } from "next/navigation";
import { MagicLinkForm } from "@/src/components/auth/MagicLinkForm/MagicLinkForm";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logInfo } from "@/src/lib/logging/log.util";

type LoginMessages = {
  app_title: string;
  app_subtitle: string;
};

async function fetchLoginMessages(): Promise<LoginMessages> {
  const defaultMessages: LoginMessages = {
    app_title: "Harmony Network",
    app_subtitle: "入居者様専用コミュニティアプリ",
  };

  try {
    const supabaseAdmin = createSupabaseServiceRoleClient();
    const { data, error } = await supabaseAdmin
      .from("static_translation_defaults")
      .select("message_key, text_ja")
      .eq("screen_key", "login");

    if (error || !data) {
      return defaultMessages;
    }

    const messages: Partial<LoginMessages> = {};

    for (const row of data as { message_key: string; text_ja: string | null }[]) {
      if (row.message_key === "app_title" && row.text_ja) {
        messages.app_title = row.text_ja;
      } else if (row.message_key === "app_subtitle" && row.text_ja) {
        messages.app_subtitle = row.text_ja;
      }
    }

    return {
      app_title: messages.app_title ?? defaultMessages.app_title,
      app_subtitle: messages.app_subtitle ?? defaultMessages.app_subtitle,
    };
  } catch {
    return defaultMessages;
  }
}

const LoginPage = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  logInfo("login.debug.auth_user", {
    userId: user?.id ?? null,
  });

  // 既にログイン済みなら、エラークエリの有無に関わらずホームへリダイレクト
  if (user) {
    redirect("/home");
  }

  const messages = await fetchLoginMessages();

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center px-4 pt-28 pb-28">
        {/* タイトル */}
        <section className="w-full max-w-md text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">{messages.app_title}</h1>
          <p className="text-sm text-gray-500">{messages.app_subtitle}</p>
        </section>

        {/* MagicLink カードタイルのみ */}
        <section className="w-full max-w-md">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <MagicLinkForm className="h-full" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
