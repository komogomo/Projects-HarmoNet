export type BoardCategoryKey =
  | "important"
  | "circular"
  | "event"
  | "rules"
  | "question"
  | "request"
  | "group"
  | "other";

// 画面上の「ビュー種別」タブ（すべて / お気に入り）。
// カテゴリの ON/OFF は BoardCategoryKey[] で別管理する。
export type BoardTab = "all" | "favorite";

export type BoardCategoryTag = {
  id: BoardCategoryKey;
  labelKey: string; // i18n key for display label
};

export type BoardPostSummary = {
  id: string;
  categoryKey: BoardCategoryKey;
  categoryName: string;
  title: string;
  contentPreview: string;
  authorDisplayName: string;
  authorDisplayType: "management" | "user";
  createdAt: string;
  hasAttachment: boolean;
  isFavorite: boolean;
  replyCount: number;
  isManagementNotice: boolean;
  isUnreadNotice: boolean;
};
