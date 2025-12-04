"use client";

import React from "react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

interface BoardEmptyStateProps {
  tOverride?: (key: string) => string;
}

export const BoardEmptyState: React.FC<BoardEmptyStateProps> = ({ tOverride }) => {
  const { t } = useI18n();
  const translate = tOverride ?? t;

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center"
      data-testid="board-top-empty-state"
    >
      <p className="mb-1 text-sm text-gray-600">{translate("board.top.empty.title")}</p>
      <p className="text-xs text-gray-600">{translate("board.top.empty.description")}</p>
    </div>
  );
};

BoardEmptyState.displayName = "BoardEmptyState";
