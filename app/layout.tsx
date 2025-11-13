import "./globals.css";
import React from "react";
import { StaticI18nProvider } from "@/src/components/common/StaticI18nProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-white text-gray-900 font-sans antialiased">
        <StaticI18nProvider>{children}</StaticI18nProvider>
      </body>
    </html>
  );
}
