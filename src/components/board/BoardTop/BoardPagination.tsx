"use client";

import React from "react";

export const BoardPagination: React.FC = () => {
  return (
    <div
      className="flex items-center justify-center py-3 text-[11px] text-gray-400"
      data-testid="board-top-pagination-placeholder"
    >
      {/* プレースホルダ実装（後続タスクで差し替え） */}
      <span>1 / 1</span>
    </div>
  );
};

BoardPagination.displayName = "BoardPagination";
