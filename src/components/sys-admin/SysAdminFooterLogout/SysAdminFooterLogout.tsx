"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { logInfo, logError } from "@/src/lib/logging/log.util";

export const SysAdminFooterLogout: React.FC = () => {
  const router = useRouter();
  const { t } = useI18n();

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
      aria-label={t("common.shortcut_navigation")}
      data-testid="sysadmin-footer-logout"
      className="fixed bottom-5 left-0 right-0 h-16 bg-white border-t border-gray-200 z-[950] flex items-center"
    >
      <div className="flex w-full max-w-5xl mx-auto justify-end items-center px-4">
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          aria-label={t("nav.logout")}
          className="flex flex-col items-center justify-center gap-1 text-xs text-gray-500"
        >
          <LogOut aria-hidden="true" className="h-5 w-5" />
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </nav>
  );
};

SysAdminFooterLogout.displayName = "SysAdminFooterLogout";
