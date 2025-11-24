"use client";

import React from "react";
import type { BoardPostSummary } from "./types";
import { BoardPostSummaryCard } from "./BoardPostSummaryCard";

interface BoardPostSummaryListProps {
  posts: BoardPostSummary[];
}

export const BoardPostSummaryList: React.FC<BoardPostSummaryListProps> = ({ posts }) => {
  return (
    <div className="space-y-3" data-testid="board-top-post-list">
      {posts.map((post) => (
        <BoardPostSummaryCard key={post.id} post={post} />
      ))}
    </div>
  );
};

BoardPostSummaryList.displayName = "BoardPostSummaryList";
