"use client";

import React from "react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

interface BoardErrorStateProps {
  onRetry?: () => void;
}

export const BoardErrorState: React.FC<BoardErrorStateProps> = ({ onRetry }) => {
  const { t } = useI18n();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // eslint-disable-next-line no-console
      console.log("retry");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-8 text-center"
      data-testid="board-top-error-state"
    >
      <p className="mb-1 text-sm font-semibold text-red-700">{t("board.top.error.title")}</p>
      <p className="mb-3 text-xs text-red-600">{t("board.top.error.description")}</p>
      <button
        type="button"
        onClick={handleRetry}
        className="inline-flex items-center rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
      >
        {t("board.top.error.retry")}
      </button>
    </div>
  );
};

BoardErrorState.displayName = "BoardErrorState";
