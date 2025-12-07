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
import { BoardPagination } from "./BoardPagination";

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
   isManagementNotice?: boolean;
   isUnreadNotice?: boolean;
};

interface BoardTopPageProps {
  tenantId: string;
  tenantName?: string;
}

const BoardTopPage: React.FC<BoardTopPageProps> = ({ tenantId, tenantName }) => {
  const { currentLocale } = useI18n();
  const router = useRouter();

  const searchParams = useSearchParams();

  const [tab, setTab] = useState<BoardTab>(() => {
    const qp = searchParams?.get("tab");
    if (qp === "favorite") return "favorite";
    return "all";
  });

  const [activeCategoryFilters, setActiveCategoryFilters] = useState<BoardCategoryKey[]>(() => {
    const qp = searchParams?.get("tab");
    if (qp && CATEGORY_TAGS.some((tag) => tag.id === qp)) {
      return [qp as BoardCategoryKey];
    }
    return [];
  });

  const [rawPosts, setRawPosts] = useState<BoardPostSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

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

      const isManagementNotice = !!post.isManagementNotice;
      const isUnreadNotice = !!post.isUnreadNotice;

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
        isManagementNotice,
        isUnreadNotice,
      };
    });
  }, [rawPosts, currentLocale]);

  const filteredPosts = useMemo(() => {
    const favoriteOn = tab === "favorite";
    const hasCategoryFilter = activeCategoryFilters.length > 0;

    // お気に入りOFFかつカテゴリフィルタなし → 全件
    if (!favoriteOn && !hasCategoryFilter) {
      return posts;
    }

    const allowedCategories = new Set<BoardCategoryKey>(activeCategoryFilters);

    return posts.filter((post) => {
      const categoryMatch = hasCategoryFilter ? allowedCategories.has(post.categoryKey) : false;
      const favoriteMatch = favoriteOn && post.isFavorite;
      return categoryMatch || favoriteMatch;
    });
  }, [posts, tab, activeCategoryFilters]);

  const totalItems = filteredPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pagedPosts = useMemo(() => {
    if (totalItems === 0) return [] as BoardPostSummary[];
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredPosts.slice(startIndex, endIndex);
  }, [filteredPosts, pageSize, safeCurrentPage, totalItems]);

  const handleChangeTab = (next: BoardTab) => {
    setTab(next);

    const url = new URL(window.location.href);
    if (next === "all") {
      url.searchParams.delete("tab");
    } else if (next === "favorite") {
      url.searchParams.set("tab", next);
    }

    router.replace(`${url.pathname}${url.search}`);
  };

  const handleResetAllFilters = () => {
    setTab("all");
    setActiveCategoryFilters([]);

    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    router.replace(`${url.pathname}${url.search}`);
  };

  const handleToggleCategoryFilter = (categoryKey: BoardCategoryKey) => {
    setActiveCategoryFilters((prev) => {
      if (prev.includes(categoryKey)) {
        return prev.filter((key) => key !== categoryKey);
      }
      return [...prev, categoryKey];
    });
  };

  const handleChangePage = (page: number) => {
    setCurrentPage((prev) => {
      const next = Number.isFinite(page) ? page : prev;
      if (next < 1) return 1;
      if (next > totalPages) return totalPages;
      return next;
    });
  };

  const handleChangePageSize = (size: number) => {
    if (!Number.isFinite(size) || size <= 0) {
      return;
    }
    setPageSize(size);
    setCurrentPage(1);
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
    if (!tenantId) {
      setMessages({});
      return;
    }

    let isCancelled = false;

    const loadMessages = async () => {
      try {
        const params = new URLSearchParams({ tenantId, lang: currentLocale });
        const response = await fetch(`/api/tenant-static-translations/board-top?${params.toString()}`);

        if (!response.ok) {
          if (!isCancelled) {
            setMessages({});
          }
          return;
        }

        const data = (await response.json().catch(() => ({}))) as {
          messages?: Record<string, string>;
        };

        if (!isCancelled && data && data.messages && typeof data.messages === "object") {
          setMessages(data.messages);
        }
      } catch {
        if (!isCancelled) {
          setMessages({});
        }
      }
    };

    loadMessages();

    return () => {
      isCancelled = true;
    };
  }, [tenantId, currentLocale]);

  const resolveMessage = (key: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return key;
  };

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
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
          <section
            aria-labelledby="board-top-title"
            data-testid="board-top-page"
            className="flex-1 space-y-4"
          >
            <header>
              {tenantName && (
                <div className="mb-1 flex justify-center">
                  <p className="max-w-full truncate text-base text-gray-600">
                    {tenantName}
                  </p>
                </div>
              )}
              <h1
                id="board-top-title"
                className="sr-only"
              >
                {resolveMessage("board.top.title")}
              </h1>
            </header>

            <div>
              <BoardTabBar
                activeTab={tab}
                activeCategories={activeCategoryFilters}
                onChangeTab={handleChangeTab}
                onToggleCategory={handleToggleCategoryFilter}
                onResetAll={handleResetAllFilters}
                categoryTags={CATEGORY_TAGS}
                tOverride={resolveMessage}
              />
            </div>

            {isLoading ? null : isError ? (
              <BoardErrorState tOverride={resolveMessage} />
            ) : filteredPosts.length === 0 ? (
              <BoardEmptyState tOverride={resolveMessage} />
            ) : (
              <>
                <BoardPostSummaryList posts={pagedPosts} tOverride={resolveMessage} />
                <BoardPagination
                  currentPage={safeCurrentPage}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onChangePage={handleChangePage}
                  onChangePageSize={handleChangePageSize}
                  labelPageSize={resolveMessage("board.top.pagination.pageSize.label")}
                  labelRangeTemplate={resolveMessage("board.top.pagination.range.template")}
                  labelPrev={resolveMessage("board.top.pagination.prev")}
                  labelNext={resolveMessage("board.top.pagination.next")}
                />
              </>
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
          aria-label={resolveMessage("board.top.newPost.button")}
          title={resolveMessage("board.top.newPost.button")}
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
