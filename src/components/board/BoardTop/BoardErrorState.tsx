"use client";

import React from "react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

interface BoardErrorStateProps {
  onRetry?: () => void;
  tOverride?: (key: string) => string;
}

export const BoardErrorState: React.FC<BoardErrorStateProps> = ({ onRetry, tOverride }) => {
  const { t } = useI18n();
  const translate = tOverride ?? t;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-8 text-center"
      data-testid="board-top-error-state"
    >
      <p className="mb-1 text-sm text-red-700">{translate("board.top.error.title")}</p>
      <p className="mb-3 text-xs text-red-600">{translate("board.top.error.description")}</p>
      <button
        type="button"
        onClick={handleRetry}
        className="inline-flex items-center rounded-full bg-red-600 px-4 py-1.5 text-xs text-white shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
      >
        {translate("board.top.error.retry")}
      </button>
    </div>
  );
};

BoardErrorState.displayName = "BoardErrorState";
