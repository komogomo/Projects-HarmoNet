"use client";

import { MagicLinkForm } from "@/src/components/auth/MagicLinkForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 flex flex-col items-center px-4 pt-28 pb-28">
        {/* タイトル */}
        <section className="w-full max-w-[420px] text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Harmony Network</h1>
          <p className="text-sm text-gray-500">入居者様専用コミュニティアプリ</p>
        </section>

        {/* ログインカード */}
        <section className="w-full max-w-[420px] bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6"></h2>

          <div className="flex flex-col items-center">
            <MagicLinkForm className="w-[270px] mx-auto [&_input]:w-full [&_button[type='submit']]:w-full" />
          </div>
        </section>

        {/* 説明文 */}
        <section className="w-full max-w-[420px] text-center text-xs text-gray-400 mt-4">
          <p>このアプリは複数画面で構成されています。</p>
          <p>右上のボタンで言語を切り替えられます。</p>
        </section>
      </main>
    </div>
  );
}
