"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { LanguageSwitch } from "@/src/components/common/LanguageSwitch";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import type { AppHeaderProps } from "./AppHeader.types";

export const AppHeader: React.FC<AppHeaderProps> = ({
  variant = 'login',
  className = '',
  testId = 'app-header',
}) => {
  const { currentLocale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState<boolean>(false);
  const [messages, setMessages] = useState<Record<string, string>>({});

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

  // ログイン画面では常に「login」バリアントとして扱う（通知ベル非表示など）
  const effectiveVariant: 'login' | 'authenticated' = pathname === '/login' ? 'login' : variant;

  useEffect(() => {
    let isCancelled = false;

    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/board/notifications/has-unread', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as { hasUnread?: boolean };
        if (!isCancelled && typeof data.hasUnread === 'boolean') {
          setHasUnread(data.hasUnread);
        }
      } catch {
        // noop: 通知未読情報取得の失敗は致命的ではないため握りつぶす
      }
    };

    if (effectiveVariant === 'authenticated') {
      fetchUnread();

      if (typeof window !== 'undefined') {
        const handleSeen = () => {
          fetchUnread();
        };

        window.addEventListener('harmonet:board-notification-seen', handleSeen as EventListener);

        return () => {
          isCancelled = true;
          window.removeEventListener('harmonet:board-notification-seen', handleSeen as EventListener);
        };
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [effectiveVariant, pathname]);
  return (
    <header
      className={`
        fixed top-0 left-0 right-0
        h-[60px]
        bg-white
        border-b border-gray-200
        z-[1000]
        ${className}
      `}
      data-testid={testId}
      role="banner"
    >
      {/* ★ ここをフレーム化 */}
      <div className={`w-full ${effectiveVariant === 'login' ? 'max-w-[500px]' : 'max-w-5xl'} mx-auto px-4 h-full flex items-center justify-between`}>

        {/* ロゴ */}
        <div className="flex items-center">
          <Image
            src="/images/logo-harmonet.png"
            alt="HarmoNet"
            width={128}
            height={32}
            style={{ width: 'auto', height: 'auto' }}
            data-testid={`${testId}-logo`}
            priority
          />
        </div>

        {/* 右側要素 */}
        <div className="flex items-center gap-4">

          {effectiveVariant === 'authenticated' && (
            <button
              className="
                relative
                w-10 h-10
                flex items-center justify-center
                text-yellow-500
                hover:bg-gray-100
                rounded-lg
                transition-colors
              "
              aria-label={resolveNavMessage("home.noticeSection.title")}
              data-testid={`${testId}-notification`}
              type="button"
              onClick={() => {
                router.push('/board');
              }}
            >
              <div className="relative">
                <Bell className="h-5 w-5" aria-hidden="true" />
                {hasUnread && (
                  <span
                    className="absolute -top-1 -right-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white"
                    aria-hidden="true"
                    data-testid={`${testId}-notification-badge`}
                  >
                    !
                  </span>
                )}
              </div>
            </button>
          )}

          <LanguageSwitch testId={`${testId}-language-switch`} />
        </div>

      </div>
    </header>
  );
};

AppHeader.displayName = 'AppHeader';
