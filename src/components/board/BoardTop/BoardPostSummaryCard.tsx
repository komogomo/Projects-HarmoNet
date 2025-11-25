"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Paperclip } from "lucide-react";
import type { BoardPostSummary, BoardCategoryKey } from "./types";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

const CATEGORY_LABEL_MAP: Record<BoardCategoryKey, string> = {
  important: "board.postForm.category.important",
  circular: "board.postForm.category.circular",
  event: "board.postForm.category.event",
  rules: "board.postForm.category.rules",
  question: "board.postForm.category.question",
  request: "board.postForm.category.request",
  group: "board.postForm.category.group",
  other: "board.postForm.category.other",
};

interface CategoryBadgeProps {
  categoryKey: BoardCategoryKey;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ categoryKey }) => {
  const { t } = useI18n();
  const labelKey = CATEGORY_LABEL_MAP[categoryKey] ?? CATEGORY_LABEL_MAP.other;
  return (
    <span className="inline-flex items-center rounded-lg bg-white border-2 border-blue-400 px-2 py-0.5 font-medium text-blue-600">
      {t(labelKey)}
    </span>
  );
};

interface BoardPostSummaryCardProps {
  post: BoardPostSummary;
}

export const BoardPostSummaryCard: React.FC<BoardPostSummaryCardProps> = ({ post }) => {
  const { t } = useI18n();
  const router = useRouter();

  const handleClick = () => {
    router.push(`/board/${post.id}`);
  };

  const createdAtLabel = new Date(post.createdAt).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      data-testid="board-top-post-card"
    >
      <div className="mb-2 flex items-center justify-between text-[11px] text-gray-500">
        <CategoryBadge categoryKey={post.categoryKey} />
        <span>{createdAtLabel}</span>
      </div>
      <p className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900">{post.title}</p>
      <p className="line-clamp-3 text-xs text-gray-600">{post.contentPreview}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
        <span>{post.authorDisplayName}</span>
        <div className="flex items-center gap-2">
          {post.replyCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5"
              aria-label={t("board.top.reply.tooltip")}
              title={t("board.top.reply.tooltip")}
            >
              <MessageCircle className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
              <span className="text-[11px] text-gray-500">{post.replyCount}</span>
            </span>
          )}
          {post.hasAttachment && (
            <span
              className="inline-flex items-center gap-1"
              aria-label={t("board.top.attachment.tooltip")}
            >
              <Paperclip className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

BoardPostSummaryCard.displayName = "BoardPostSummaryCard";
