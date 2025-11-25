"use client";

import React from "react";
import { Star } from "lucide-react";
import type { BoardTab, BoardCategoryTag } from "./types";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

export interface BoardTabBarProps {
  activeTab: BoardTab;
  onChange: (next: BoardTab) => void;
  categoryTags: BoardCategoryTag[];
}

export const BoardTabBar: React.FC<BoardTabBarProps> = ({ activeTab, onChange, categoryTags }) => {
  const { t } = useI18n();

  return (
    <nav aria-label="Board tabs">
      <div className="flex flex-wrap gap-2 text-xs">
        {/* 'all' tab */}
        {(() => {
          const id: BoardTab = "all";
          const active = activeTab === id;
          const baseClasses =
            "whitespace-nowrap rounded-lg px-3 py-1.5 font-medium border-2 transition-colors";
          const activeClasses = "bg-white text-blue-600 border-blue-400";
          const inactiveClasses = "bg-white text-gray-500 border-gray-200";

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
              data-testid={`board-top-tab-${id}`}
            >
              {t("board.top.tab.all")}
            </button>
          );
        })()}

        {/* category tabs */}
        {categoryTags.map((tag) => {
          const id = tag.id as BoardTab;
          const active = activeTab === id;
          const baseClasses =
            "whitespace-nowrap rounded-lg px-3 py-1.5 font-medium border-2 transition-colors";
          const activeClasses = "bg-white text-blue-600 border-blue-400";
          const inactiveClasses = "bg-white text-gray-500 border-gray-200";

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
              data-testid={`board-top-tab-${id}`}
            >
              {t(tag.labelKey)}
            </button>
          );
        })}

        {/* favorite tab (☆) */}
        {(() => {
          const id: BoardTab = "favorite";
          const active = activeTab === id;
          const baseClasses =
            "whitespace-nowrap rounded-lg px-3 py-1.5 font-medium border-2 transition-colors";
          const activeClasses = "bg-white text-yellow-400 border-yellow-400";
          const inactiveClasses = "bg-white text-gray-500 border-gray-200";

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
              data-testid={`board-top-tab-${id}`}
              aria-label={t("board.top.tab.favorite")}
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
