"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import type { HomeNoticeItem } from "./HomeNoticeSection.types";
import { HomeNoticeSection } from "./HomeNoticeSection";
import type { BoardCategoryKey } from "@/src/components/board/BoardTop/types";

type SupportedBoardLang = "ja" | "en" | "zh";

type BoardPostTranslationDto = {
  lang: SupportedBoardLang;
  title: string | null;
  content: string;
};

interface BoardPostSummaryDto {
  id: string;
  categoryKey: BoardCategoryKey | string;
  categoryName: string | null;
  originalTitle: string;
  originalContent: string;
  authorDisplayName: string;
  authorDisplayType: "management" | "user";
  createdAt: string;
  hasAttachment: boolean;
  translations: BoardPostTranslationDto[];
}

interface HomeBoardNoticeContainerProps {
  tenantId: string;
  tenantName?: string;
  maxItems?: number;
}

// 管理組合として投稿されるカテゴリ（BoardPostForm と同じ前提）
const MANAGEMENT_CATEGORY_KEYS: BoardCategoryKey[] = ["important", "circular", "event", "rules"];

// HOME に表示するお知らせの対象期間（日数）
const MAX_NOTICE_DAYS = 60;

export const HomeBoardNoticeContainer: React.FC<HomeBoardNoticeContainerProps> = ({ tenantId, tenantName, maxItems }) => {
  const { currentLocale } = useI18n();
  const [rawPosts, setRawPosts] = useState<BoardPostSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchPosts = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        const params = new URLSearchParams({ tenantId });
        const response = await fetch(`/api/board/posts?${params.toString()}`);

        if (!response.ok) {
          if (!isCancelled) {
            setIsError(true);
            setRawPosts([]);
          }
          return;
        }

        const data = (await response.json().catch(() => ({}))) as { posts?: BoardPostSummaryDto[] };
        const posts = Array.isArray(data.posts) ? data.posts : [];

        if (!isCancelled) {
          setRawPosts(posts);
        }
      } catch {
        if (!isCancelled) {
          setIsError(true);
          setRawPosts([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    if (tenantId) {
      fetchPosts();
    } else {
      setRawPosts([]);
      setIsLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [tenantId]);

  const items: HomeNoticeItem[] = useMemo(() => {
    if (!rawPosts || rawPosts.length === 0) {
      return [];
    }

    const nowMs = Date.now();
    const thresholdMs = nowMs - MAX_NOTICE_DAYS * 24 * 60 * 60 * 1000;

    const managementPosts = rawPosts.filter((post) => {
      const createdAtMs = new Date(post.createdAt).getTime();
      if (Number.isNaN(createdAtMs) || createdAtMs < thresholdMs) {
        return false;
      }

      const key = post.categoryKey as BoardCategoryKey;
      return MANAGEMENT_CATEGORY_KEYS.includes(key);
    });

    if (managementPosts.length === 0) {
      return [];
    }

    managementPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const localeForDate: string =
      currentLocale === "en" ? "en-US" : currentLocale === "zh" ? "zh-CN" : "ja-JP";

    return managementPosts.map((post) => {
      const translation = post.translations?.find((tr) => tr.lang === currentLocale);
      const titleSource = translation?.title && translation.title.trim().length > 0
        ? translation.title
        : post.originalTitle;

      const bodySource = translation?.content && translation.content.trim().length > 0
        ? translation.content
        : post.originalContent;

      const dt = new Date(post.createdAt);
      const publishedAt = Number.isNaN(dt.getTime())
        ? post.createdAt
        : dt.toLocaleString(localeForDate, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });

      const item: HomeNoticeItem = {
        id: post.id,
        title: titleSource,
        content: bodySource,
        publishedAt,
      };

      return item;
    });
  }, [rawPosts, currentLocale]);

  // isLoading / isError は現状特別扱いせず、items が空のときは空表示を HomeNoticeSection に任せる
  return <HomeNoticeSection items={items} maxItems={maxItems} tenantName={tenantName} />;
};

HomeBoardNoticeContainer.displayName = "HomeBoardNoticeContainer";
