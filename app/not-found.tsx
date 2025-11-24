import React from "react";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";

export default function NotFoundPage() {
  return (
    <>
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-28 pb-28">
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <p className="text-sm font-semibold text-gray-500">404</p>
            <h1 className="text-lg font-semibold text-gray-900">This page could not be found.</h1>
            <p className="text-xs text-gray-500 text-center">
              URL が正しいかご確認のうえ、ホーム画面や掲示板一覧から操作をやり直してください。
            </p>
          </div>
        </div>
      </main>
      <HomeFooterShortcuts />
    </>
  );
}
