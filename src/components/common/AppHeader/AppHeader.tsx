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
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  const hasPathname = typeof pathname === 'string' && pathname.length > 0;
  const isSysAdminPath = !hasPathname ? true : pathname.startsWith('/sys-admin');
  const isLoginPath = !hasPathname || pathname === '/login' || pathname === '/sys-admin/login';

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

    if (!isLoginPath && !isSysAdminPath) {
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
  }, [isLoginPath, isSysAdminPath, pathname]);
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
      <div className={`w-full ${isLoginPath ? 'max-w-[500px]' : 'max-w-5xl'} mx-auto px-4 h-full flex items-center justify-between`}>

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

          {!isLoginPath && !isSysAdminPath && (
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
              aria-label={t("home.noticeSection.title")}
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
