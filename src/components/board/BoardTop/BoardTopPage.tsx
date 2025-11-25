"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";
import type { BoardTab, BoardPostSummary, BoardCategoryTag, BoardCategoryKey } from "./types";
import { BoardTabBar } from "./BoardTabBar";
import { BoardPostSummaryList } from "./BoardPostSummaryList";
import { BoardEmptyState } from "./BoardEmptyState";
import { BoardErrorState } from "./BoardErrorState";

const CATEGORY_TAGS: BoardCategoryTag[] = [
  { id: "important", labelKey: "board.postForm.category.important" },
  { id: "circular", labelKey: "board.postForm.category.circular" },
  { id: "event", labelKey: "board.postForm.category.event" },
  { id: "rules", labelKey: "board.postForm.category.rules" },
  { id: "question", labelKey: "board.postForm.category.question" },
  { id: "request", labelKey: "board.postForm.category.request" },
  { id: "group", labelKey: "board.postForm.category.group" },
  { id: "other", labelKey: "board.postForm.category.other" },
];

type BoardPostTranslationDto = {
  lang: "ja" | "en" | "zh";
  title: string | null;
  content: string;
};

type BoardPostSummaryDto = {
  id: string;
  categoryKey: string;
  categoryName: string | null;
  originalTitle: string;
  originalContent: string;
  authorDisplayName: string;
  authorDisplayType: "management" | "user";
  createdAt: string;
  hasAttachment: boolean;
  translations: BoardPostTranslationDto[];
  isFavorite?: boolean;
   replyCount?: number;
};

interface BoardTopPageProps {
  tenantId: string;
}

const BoardTopPage: React.FC<BoardTopPageProps> = ({ tenantId }) => {
  const { t, currentLocale } = useI18n();
  const router = useRouter();

  const searchParams = useSearchParams();

  const [tab, setTab] = useState<BoardTab>(() => {
    const qp = searchParams?.get("tab");
    if (!qp) return "all";

    const validIds = new Set<string>(["all", ...CATEGORY_TAGS.map((tag) => tag.id), "favorite"]);
    return validIds.has(qp) ? (qp as BoardTab) : "all";
  });
  const [rawPosts, setRawPosts] = useState<BoardPostSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const [fabOffset, setFabOffset] = useState({ x: 0, y: 0 });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  const posts: BoardPostSummary[] = useMemo(() => {
    if (!rawPosts || rawPosts.length === 0) {
      return [];
    }

    return rawPosts.map((post) => {
      const translation = post.translations.find((tr) => tr.lang === currentLocale);

      const mappedCategoryKey = CATEGORY_TAGS.some((tag) => tag.id === post.categoryKey)
        ? (post.categoryKey as BoardCategoryKey)
        : ("other" as BoardCategoryKey);

      const effectiveTitle =
        translation && translation.title && translation.title.trim().length > 0
          ? translation.title
          : post.originalTitle;

      const effectiveContent = translation?.content ?? post.originalContent;

      return {
        id: post.id,
        categoryKey: mappedCategoryKey,
        categoryName: post.categoryName ?? "",
        title: effectiveTitle,
        contentPreview: effectiveContent,
        authorDisplayName: post.authorDisplayName,
        authorDisplayType: post.authorDisplayType,
        createdAt: post.createdAt,
        hasAttachment: post.hasAttachment,
        isFavorite: !!post.isFavorite,
        replyCount: typeof post.replyCount === "number" ? post.replyCount : 0,
      };
    });
  }, [rawPosts, currentLocale]);

  const filteredPosts = useMemo(() => {
    if (tab === "all") return posts;
    if (tab === "favorite") {
      return posts.filter((post) => post.isFavorite);
    }
    return posts.filter((post) => post.categoryKey === (tab as BoardCategoryKey));
  }, [posts, tab]);

  const handleChangeTab = (next: BoardTab) => {
    setTab(next);

    const url = new URL(window.location.href);
    if (next === "all") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", next);
    }

    router.replace(`${url.pathname}${url.search}`);
  };

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

        const data = (await response.json().catch(() => ({}))) as {
          posts?: BoardPostSummaryDto[];
        };

        if (isCancelled) {
          return;
        }

        setRawPosts(Array.isArray(data.posts) ? data.posts : []);
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

    fetchPosts();

    return () => {
      isCancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (!isDraggingFab) return;

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      let clientX: number;
      let clientY: number;

      if ("touches" in event) {
        const touch = event.touches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        const mouseEvent = event as MouseEvent;
        clientX = mouseEvent.clientX;
        clientY = mouseEvent.clientY;
      }

      const start = dragStartRef.current;
      if (!start) return;

      const dx = clientX - start.x;
      const dy = clientY - start.y;

      if (!hasMovedRef.current) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 4) {
          hasMovedRef.current = true;
        }
      }

      const startOffset = offsetStartRef.current;
      setFabOffset({
        x: startOffset.x + dx,
        y: startOffset.y + dy,
      });
    };

    const handlePointerUp = () => {
      setIsDraggingFab(false);

      if (!hasMovedRef.current) {
        router.push("/board/new");
      }

      suppressNextClickRef.current = true;
      hasMovedRef.current = false;
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("touchcancel", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("touchcancel", handlePointerUp);
    };
  }, [isDraggingFab, router]);

  const handleFabMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();

    hasMovedRef.current = false;

    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    offsetStartRef.current = fabOffset;
    setIsDraggingFab(true);
  };

  const handleFabTouchStart = (event: React.TouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    hasMovedRef.current = false;

    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    offsetStartRef.current = fabOffset;
    setIsDraggingFab(true);
  };

  const handleClickNewPost = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    router.push("/board/new");
  };

  return (
    <>
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-28 pb-24">
          <section
            aria-labelledby="board-top-title"
            data-testid="board-top-page"
            className="flex-1 space-y-4"
          >
            <header>
              <h1
                id="board-top-title"
                className="text-xl font-semibold text-gray-900"
              >
                {t("board.top.title")}            
              </h1>
              <p className="mt-1 text-xs text-gray-600">
                {t("board.top.subtitle")}
              </p>
            </header>

            <div>
              <BoardTabBar activeTab={tab} onChange={handleChangeTab} categoryTags={CATEGORY_TAGS} />
            </div>

            {isLoading ? null : isError ? (
              <BoardErrorState />
            ) : filteredPosts.length === 0 ? (
              <BoardEmptyState />
            ) : (
              <BoardPostSummaryList posts={filteredPosts} />
            )}
          </section>
        </div>

        <button
          type="button"
          onClick={handleClickNewPost}
          onMouseDown={handleFabMouseDown}
          onTouchStart={handleFabTouchStart}
          className="fixed bottom-24 right-4 z-[960] flex h-11 w-11 items-center justify-center rounded-full bg-transparent border-2 border-blue-400 text-blue-600 shadow-lg shadow-blue-200/60 hover:bg-blue-50/40 active:bg-blue-100/40 focus:outline-none focus:ring-2 focus:ring-blue-300/70 focus:ring-offset-2"
          style={{ transform: `translate3d(${fabOffset.x}px, ${fabOffset.y}px, 0)` }}
          aria-label={t("board.top.newPost.button")}
          title={t("board.top.newPost.button")}
          data-testid="board-top-fab"
        >
          <Plus className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
        </button>
      </main>
      <HomeFooterShortcuts />
    </>
  );
};

export default BoardTopPage;
