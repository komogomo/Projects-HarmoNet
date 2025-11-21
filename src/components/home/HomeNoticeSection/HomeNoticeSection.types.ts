export type HomeNoticeItem = {
  id: string;
  title: string;
  publishedAt: string;
};

export type HomeNoticeSectionProps = {
  items: HomeNoticeItem[];
  maxItems?: number;
};

export const DEFAULT_HOME_NOTICE_COUNT = 2;
export const HOME_NOTICE_MAX_COUNT = 3;

export const clampNoticeCount = (value: number | undefined): number => {
  if (value == null) return DEFAULT_HOME_NOTICE_COUNT;
  const numeric = Math.floor(value);
  if (Number.isNaN(numeric)) return DEFAULT_HOME_NOTICE_COUNT;
  return Math.min(Math.max(numeric, 1), HOME_NOTICE_MAX_COUNT);
};
