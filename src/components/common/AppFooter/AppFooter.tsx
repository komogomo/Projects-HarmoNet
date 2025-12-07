"use client";
import React, { useEffect, useState } from "react";
import type { AppFooterProps } from "./AppFooter.types";
import { useI18n } from "@/src/components/common/StaticI18nProvider";

export const AppFooter: React.FC<AppFooterProps> = ({
  className = '',
  testId = 'app-footer',
  variant = 'login',
}) => {
  const { currentLocale } = useI18n();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const containerMaxWidth = variant === "login" ? "max-w-[500px]" : "max-w-5xl";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams({ lang: currentLocale });
        const res = await fetch(`/api/static-translations/nav?${params.toString()}`);
        if (!res.ok) return;

        const data = (await res.json().catch(() => ({}))) as {
          messages?: Record<string, string>;
        };

        if (!cancelled && data && data.messages && typeof data.messages === "object") {
          setMessages(data.messages);
        }
      } catch {
        if (!cancelled) {
          setMessages({});
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [currentLocale]);

  const resolveNavMessage = (key: string): string => {
    const value = messages[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    return key;
  };

  return (
    <footer
      role="contentinfo"
      data-testid={testId}
      className={`
        fixed bottom-0 left-0 right-0
        z-[900]
        bg-white border-t border-gray-200
        py-1
        text-[11px] text-gray-400 text-center
        ${className}
      `}
    >
      <div className={`w-full ${containerMaxWidth} mx-auto px-4`}>
        {resolveNavMessage("common.copyright")}
      </div>
    </footer>
  );
};

AppFooter.displayName = 'AppFooter';
