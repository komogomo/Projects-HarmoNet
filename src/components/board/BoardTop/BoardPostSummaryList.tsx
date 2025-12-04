"use client";

import React from "react";
import type { BoardPostSummary } from "./types";
import { BoardPostSummaryCard } from "./BoardPostSummaryCard";

interface BoardPostSummaryListProps {
  posts: BoardPostSummary[];
  tOverride?: (key: string) => string;
}

export const BoardPostSummaryList: React.FC<BoardPostSummaryListProps> = ({ posts, tOverride }) => {
  return (
    <div className="space-y-3" data-testid="board-top-post-list">
      {posts.map((post) => (
        <BoardPostSummaryCard key={post.id} post={post} tOverride={tOverride} />
      ))}
    </div>
  );
};

BoardPostSummaryList.displayName = "BoardPostSummaryList";
