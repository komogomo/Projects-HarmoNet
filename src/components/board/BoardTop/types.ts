export type BoardCategoryKey =
  | "important"
  | "circular"
  | "event"
  | "rules"
  | "question"
  | "request"
  | "group"
  | "other";

export type BoardTab = "all" | BoardCategoryKey;

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
};
