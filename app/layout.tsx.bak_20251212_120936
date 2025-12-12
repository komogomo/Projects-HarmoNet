import "./globals.css";
import React from "react";
import { StaticI18nProvider } from "@/src/components/common/StaticI18nProvider";
import { AppHeader } from "@/src/components/common/AppHeader/AppHeader";
import { AppFooter } from "@/src/components/common/AppFooter/AppFooter";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let variant: "login" | "authenticated" = "login";
  let tenantName = "";

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      variant = "authenticated";

      // テナント名の取得
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (userTenant?.tenant_id) {
        // RLSを回避してテナント名を取得するためにServiceRoleClientを使用
        const supabaseAdmin = createSupabaseServiceRoleClient();
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('tenant_name')
          .eq('id', userTenant.tenant_id)
          .single();

        if (tenant) {
          tenantName = tenant.tenant_name;
        }
      }
    }
  } catch {
    // 認証状態の取得に失敗した場合はログインヘッダーのままとする
  }

  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="bg-white text-gray-900 font-sans antialiased">
        <StaticI18nProvider>
          <AppHeader variant={variant} />
          {children}
          <AppFooter variant={variant} />
        </StaticI18nProvider>
      </body>
    </html>
  );
}
