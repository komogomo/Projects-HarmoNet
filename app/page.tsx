"use client";

import React from "react";
import { AppHeader } from "@/components/common/AppHeader/AppHeader";
import { AppFooter } from "@/components/common/AppFooter/AppFooter";
import MagicLinkForm from "@/components/login/MagicLinkForm/MagicLinkForm";
import PasskeyButton from "@/components/login/PasskeyButton/PasskeyButton";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50">
      <header className="w-full max-w-md px-4 pt-6">
        <AppHeader />
      </header>

      <main className="flex w-full flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md flex flex-col gap-6">
          <MagicLinkForm />
          <PasskeyButton />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}