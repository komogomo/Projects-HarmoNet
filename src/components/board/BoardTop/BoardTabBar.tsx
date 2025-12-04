"use client";

import React from "react";
import { Star } from "lucide-react";
import type { BoardTab, BoardCategoryKey, BoardCategoryTag } from "./types";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

export interface BoardTabBarProps {
  activeTab: BoardTab;
  activeCategories: BoardCategoryKey[];
  onChangeTab: (next: BoardTab) => void;
  onToggleCategory: (category: BoardCategoryKey) => void;
  onResetAll: () => void;
  categoryTags: BoardCategoryTag[];
  tOverride?: (key: string) => string;
}

export const BoardTabBar: React.FC<BoardTabBarProps> = ({
  activeTab,
  activeCategories,
  onChangeTab,
  onToggleCategory,
  onResetAll,
  categoryTags,
  tOverride,
}) => {
  const { t } = useI18n();
  const translate = tOverride ?? t;

  return (
    <nav aria-label="Board tabs">
      <div className="flex flex-wrap gap-2 text-xs">
        {/* 'all' tab */}
        {(() => {
          const id: BoardTab = "all";
          const isActive = activeTab === id && activeCategories.length === 0;
          const baseClasses =
            "whitespace-nowrap rounded-md px-3 py-1.5 border-2 transition-colors";
          const activeClasses = "bg-white text-blue-600 border-blue-400";
          const inactiveClasses = "bg-white text-gray-600 border-gray-200";

          return (
            <button
              key={id}
              type="button"
              onClick={onResetAll}
              className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
              data-testid={`board-top-tab-${id}`}
            >
              {translate("board.top.tab.all")}
            </button>
          );
        })()}

        {/* category tabs */}
        {categoryTags.map((tag) => {
          const id = tag.id as BoardCategoryKey;
          const isActive = activeCategories.includes(id);
          const baseClasses =
            "whitespace-nowrap rounded-md px-3 py-1.5 border-2 transition-colors";
          const activeClasses = "bg-white text-blue-600 border-blue-400";
          const inactiveClasses = "bg-white text-gray-600 border-gray-200";

          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggleCategory(id)}
              className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
              data-testid={`board-top-tab-${id}`}
            >
              {translate(tag.labelKey)}
            </button>
          );
        })}

        {/* favorite tab (☆) */}
        {(() => {
          const id: BoardTab = "favorite";
          const active = activeTab === id;
          const baseClasses =
            "whitespace-nowrap rounded-md px-3 py-1.5 border-2 transition-colors";
          const activeClasses = "bg-white text-yellow-400 border-yellow-400";
          const inactiveClasses = "bg-white text-gray-600 border-gray-200";

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeTab(active ? "all" : id)}
              className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
              data-testid={`board-top-tab-${id}`}
              aria-label={translate("board.top.tab.favorite")}
            >
              <Star className="h-4 w-4" aria-hidden="true" />
            </button>
          );
        })()}
      </div>
    </nav>
  );
};

BoardTabBar.displayName = "BoardTabBar";
