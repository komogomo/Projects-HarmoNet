import "./globals.css";
import React from "react";
import { StaticI18nProvider } from "@/src/components/common/StaticI18nProvider";
import { AppHeader } from "@/src/components/common/AppHeader/AppHeader";
import { AppFooter } from "@/src/components/common/AppFooter/AppFooter";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let variant: "login" | "authenticated" = "login";

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      variant = "authenticated";
    }
  } catch {
    // 認証状態の取得に失敗した場合はログインヘッダーのままとする
  }

  return (
    <html lang="ja">
      <body className="bg-white text-gray-900 font-sans antialiased">
        <StaticI18nProvider>
          <AppHeader variant={variant} />
          {children}
          <AppFooter />
        </StaticI18nProvider>
      </body>
    </html>
  );
}
