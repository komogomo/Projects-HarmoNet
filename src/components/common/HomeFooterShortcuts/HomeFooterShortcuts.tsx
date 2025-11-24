"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, MessageSquare, Calendar, User, LogOut } from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { logInfo, logError } from "@/src/lib/logging/log.util";

export interface HomeFooterShortcutsProps {
  className?: string;
  testId?: string;
}

type ShortcutKey = "home" | "board" | "facility" | "mypage" | "logout";

type ShortcutItem = {
  key: ShortcutKey;
  labelKey: string;
  href: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const SHORTCUT_ITEMS: ShortcutItem[] = [
  {
    key: "home",
    labelKey: "nav.home",
    href: "/home",
    Icon: Home,
  },
  {
    key: "board",
    labelKey: "nav.board",
    href: "/board",
    Icon: MessageSquare,
  },
  {
    key: "facility",
    labelKey: "nav.facility",
    href: "",
    Icon: Calendar,
  },
  {
    key: "mypage",
    labelKey: "nav.mypage",
    href: "",
    Icon: User,
  },
  {
    key: "logout",
    labelKey: "nav.logout",
    href: "",
    Icon: LogOut,
  },
];

export const HomeFooterShortcuts: React.FC<HomeFooterShortcutsProps> = ({
  className = "",
  testId = "home-footer-shortcuts",
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  const handleClick = async (item: ShortcutItem) => {
    if (item.key !== "logout") return;

    logInfo("footer.logout.start");
    const { error } = await supabase.auth.signOut();

    if (error) {
      logError("footer.logout.fail", {
        code: (error as any).code ?? "unknown",
        message: error.message,
      });
    } else {
      logInfo("footer.logout.success");
    }

    router.replace("/login");
  };

  const isActive = (href: string) => {
    if (!href) return false;
    if (!pathname) return false;
    return pathname.startsWith(href);
  };

  return (
    <nav
      role="navigation"
      aria-label={t("common.shortcut_navigation")}
      data-testid={testId}
      className={`
        fixed bottom-5 left-0 right-0 h-16
        bg-white border-t border-gray-200 z-[950]
        flex items-center
        ${className}
      `}
    >
      <div className="flex w-full justify-around items-center px-3">
        {SHORTCUT_ITEMS.map((item) => {
          const active = isActive(item.href);
          const { Icon } = item;
          const baseClasses = `
            flex flex-col items-center justify-center gap-1 text-xs
            ${active ? "text-blue-600 border-t-2 border-blue-600 font-semibold" : "text-gray-500"}
          `;

          const commonProps = {
            "aria-label": t(item.labelKey),
            "data-testid": `${testId}-item-${item.key}`,
            className: baseClasses,
          } as const;

          if (item.key === "logout") {
            return (
              <button
                type="button"
                key={item.key}
                {...commonProps}
                onClick={() => {
                  void handleClick(item);
                }}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
                <span>{t(item.labelKey)}</span>
              </button>
            );
          }

          return (
            <button
              type="button"
              key={item.key}
              {...commonProps}
              onClick={() => {
                if (item.href) {
                  router.push(item.href);
                }
              }}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

HomeFooterShortcuts.displayName = "HomeFooterShortcuts";
