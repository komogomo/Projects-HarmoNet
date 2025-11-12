"use client";

import React from "react";
import { AppHeader } from "@/components/common/AppHeader/AppHeader";
import { AppFooter } from "@/components/common/AppFooter/AppFooter";
import MagicLinkForm from "@/components/auth/MagicLinkForm/MagicLinkForm";
import PasskeyButton from "@/components/login/PasskeyButton/PasskeyButton";
import { StaticI18nProvider } from "@/components/common/StaticI18nProvider/StaticI18nProvider";

/**
 * HarmoNet ログインページ
 * - MagicLink + Passkey の2段構成
 * - StaticI18nProvider で i18nコンテキストを提供
 * - Storybook環境と同等の翻訳状態を維持
 */
export default function LoginPage() {
  return (
    <StaticI18nProvider>
      <div className="flex min-h-screen flex-col items-center bg-gray-50">
        {/* Header */}
        <header className="w-full max-w-md px-4 pt-6">
          <AppHeader />
        </header>

        {/* Main Content */}
        <main className="flex w-full flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-md flex flex-col gap-6">
            {/* MagicLink認証フォーム */}
            <MagicLinkForm />

            {/* Passkey認証ボタン（現行は並列、今後はMagicLinkForm内に統合予定） */}
            <PasskeyButton />
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-md px-4 pb-6">
          <AppFooter />
        </footer>
      </div>
    </StaticI18nProvider>
  );
}
