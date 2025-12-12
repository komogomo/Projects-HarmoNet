"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { logInfo, logError } from "@/src/lib/logging/log.util";

export const SysAdminFooterLogout: React.FC = () => {
  const router = useRouter();
  const { currentLocale } = useI18n();
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
    return "";
  };

  const handleLogout = async () => {
    logInfo("sysadmin.footer.logout.start");
    const { error } = await supabase.auth.signOut();

    if (error) {
      logError("sysadmin.footer.logout.fail", {
        code: (error as any).code ?? "unknown",
        message: error.message,
      });
    } else {
      logInfo("sysadmin.footer.logout.success");
    }

    router.replace("/login");
  };

  return (
    <nav
      role="navigation"
      aria-label={resolveNavMessage("common.shortcut_navigation")}
      data-testid="sysadmin-footer-logout"
      className="fixed bottom-5 left-0 right-0 h-16 bg-white border-t border-gray-200 z-[950] flex items-center"
    >
      <div className="flex w-full max-w-5xl mx-auto justify-end items-center px-4">
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          aria-label={resolveNavMessage("nav.logout")}
          className="flex flex-col items-center justify-center gap-1 text-xs text-gray-500"
        >
          <LogOut aria-hidden="true" className="h-5 w-5" />
          <span>{resolveNavMessage("nav.logout")}</span>
        </button>
      </div>
    </nav>
  );
};

SysAdminFooterLogout.displayName = "SysAdminFooterLogout";
