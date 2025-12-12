"use client";
import React from "react";
import type { AppFooterProps } from "./AppFooter.types";
import { useI18n } from "@/src/components/common/StaticI18nProvider";

export const AppFooter: React.FC<AppFooterProps> = ({
  className = '',
  testId = 'app-footer',
  variant = 'login',
}) => {
  const { t } = useI18n();
  const containerMaxWidth = variant === "login" ? "max-w-[500px]" : "max-w-5xl";

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
        {t("common.copyright")}
      </div>
    </footer>
  );
};

AppFooter.displayName = 'AppFooter';
