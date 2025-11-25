"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Star, Trash2, Volume2 } from "lucide-react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";
import type { BoardPostDetailDto } from "@/src/server/board/getBoardPostById";
import type { BoardCategoryKey } from "@/src/components/board/BoardTop/types";

interface BoardDetailPageProps {
  data: BoardPostDetailDto;
}

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

const resolveCategoryKey = (raw: string): BoardCategoryKey => {
  const allowed: BoardCategoryKey[] = [
    "important",
    "circular",
    "event",
    "rules",
    "question",
    "request",
    "group",
    "other",
  ];
  return (allowed.includes(raw as BoardCategoryKey) ? raw : "other") as BoardCategoryKey;
};

const formatDateTime = (iso: string, locale: "ja" | "en" | "zh"): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const localeTag = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "ja-JP";

  return date.toLocaleString(localeTag, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isPdfAttachment = (fileType: string, fileName: string): boolean => {
  const lowerType = (fileType || "").toLowerCase();
  const lowerName = (fileName || "").toLowerCase();
  if (lowerType.includes("pdf")) return true;
  return lowerName.endsWith(".pdf");
};

const isImageAttachment = (fileType: string, fileName: string): boolean => {
  const lowerType = (fileType || "").toLowerCase();
  const lowerName = (fileName || "").toLowerCase();

  if (lowerType.startsWith("image/")) {
    return lowerType === "image/jpeg" || lowerType === "image/jpg" || lowerType === "image/png";
  }

  return (
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png")
  );
};

type AttachmentPreviewState = {
  url: string;
  fileName: string;
  isPdf: boolean;
  isImage: boolean;
} | null;

const BoardDetailPage: React.FC<BoardDetailPageProps> = ({ data }) => {
  const { t, currentLocale } = useI18n();
  const router = useRouter();
  const [preview, setPreview] = useState<AttachmentPreviewState>(null);
  const [isLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(data.isFavorite ?? false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [favoriteErrorKey, setFavoriteErrorKey] = useState<string | null>(null);
  const [isPostDeleting, setIsPostDeleting] = useState(false);
  const [postDeleteErrorKey, setPostDeleteErrorKey] = useState<string | null>(null);
  const [comments, setComments] = useState(data.comments);
  const [deleteErrorKey, setDeleteErrorKey] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [confirmingCommentId, setConfirmingCommentId] = useState<string | null>(null);
  const [ttsState, setTtsState] = useState<"idle" | "loading" | "playing">("idle");
  const [ttsErrorKey, setTtsErrorKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const {
    categoryKey,
    categoryLabelKey,
    title,
    content,
    createdAtLabel,
  } = useMemo(() => {
    const translation = data.translations.find((tr) => tr.lang === currentLocale);

    const effectiveTitle =
      translation && translation.title && translation.title.trim().length > 0
        ? translation.title
        : data.originalTitle;

    const effectiveContent = translation?.content ?? data.originalContent;

    const mappedCategoryKey = resolveCategoryKey(data.categoryKey);
    const labelKey = CATEGORY_LABEL_MAP[mappedCategoryKey] ?? CATEGORY_LABEL_MAP.other;

    const createdAt = formatDateTime(data.createdAt, currentLocale);

    return {
      categoryKey: mappedCategoryKey,
      categoryLabelKey: labelKey,
      title: effectiveTitle,
      content: effectiveContent,
      createdAtLabel: createdAt,
    };
  }, [data, currentLocale]);

  const canReply = useMemo(() => {
    const forbidden: BoardCategoryKey[] = ["important", "circular", "event", "rules"];
    return !forbidden.includes(categoryKey);
  }, [categoryKey]);

  // 通知の既読更新: 詳細画面（特定の投稿）を開いた時点で mark-seen API を呼び出す
  useEffect(() => {
    const markSeen = async () => {
      try {
        await fetch("/api/board/notifications/mark-seen", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ postId: data.id }),
        });
      } catch {
        // noop: 既読更新失敗は致命的ではないため握りつぶす
      }
    };

    markSeen();
  }, [data.id]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const handleReplyClick = () => {
    router.push(`/board/new?replyTo=${data.id}`);
  };

  const [isPostDeleteConfirmOpen, setIsPostDeleteConfirmOpen] = useState(false);

  const handleRequestDeletePost = () => {
    if (isPostDeleting) return;
    setIsPostDeleteConfirmOpen(true);
    setPostDeleteErrorKey(null);
  };

  const handleCancelDeletePost = () => {
    if (isPostDeleting) return;
    setIsPostDeleteConfirmOpen(false);
  };

  const handleConfirmDeletePost = async () => {
    if (isPostDeleting) return;

    setIsPostDeleting(true);
    setPostDeleteErrorKey(null);

    try {
      const res = await fetch(`/api/board/posts/${data.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("post_delete_failed");
      }

      router.push("/board");
    } catch {
      setPostDeleteErrorKey("board.detail.post.deleteError");
    } finally {
      setIsPostDeleteConfirmOpen(false);
      setIsPostDeleting(false);
    }
  };

  const handleRequestDeleteComment = (commentId: string) => {
    if (deletingCommentId) return;
    setConfirmingCommentId(commentId);
    setDeleteErrorKey(null);
  };

  const handleCancelDeleteComment = () => {
    if (deletingCommentId) return;
    setConfirmingCommentId(null);
  };

  const handleConfirmDeleteComment = async () => {
    if (!confirmingCommentId || deletingCommentId) return;

    const commentId = confirmingCommentId;
    setDeletingCommentId(commentId);
    setDeleteErrorKey(null);

    try {
      const res = await fetch(`/api/board/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("comment_delete_failed");
      }

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      setConfirmingCommentId(null);
    } catch {
      setDeleteErrorKey("board.detail.comment.deleteError");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleToggleFavorite = async () => {
    if (isUpdatingFavorite) return;

    setIsUpdatingFavorite(true);
    setFavoriteErrorKey(null);

    try {
      const method = isFavorite ? "DELETE" : "POST";
      const res = await fetch("/api/board/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: data.id }),
      });

      if (!res.ok) {
        throw new Error("favorite_api_error");
      }

      const json = (await res.json().catch(() => ({}))) as { isFavorite?: boolean };
      if (typeof json.isFavorite === "boolean") {
        setIsFavorite(json.isFavorite);
      } else {
        setIsFavorite(!isFavorite);
      }
    } catch {
      setFavoriteErrorKey("board.detail.favorite.error");
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  const handleTtsClick = async () => {
    if (!content || content.trim().length === 0) {
      return;
    }

    if (ttsState === "playing") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      setTtsState("idle");
      return;
    }

    setTtsState("loading");
    setTtsErrorKey(null);

    const languageCode =
      currentLocale === "en" ? "en-US" : currentLocale === "zh" ? "zh-CN" : "ja-JP";

    try {
      const res = await fetch("/api/board/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: content,
          language: languageCode,
          postId: data.id,
        }),
      });

      if (!res.ok) {
        setTtsState("idle");
        setTtsErrorKey("board.detail.tts.error");
        return;
      }

      const audioData = await res.arrayBuffer();
      const mimeType = res.headers.get("Content-Type") || "audio/mpeg";
      const blob = new Blob([audioData], { type: mimeType });
      const url = URL.createObjectURL(blob);

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audioUrlRef.current = url;

      audio.onended = () => {
        setTtsState("idle");
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setTtsState("idle");
        setTtsErrorKey("board.detail.tts.error");
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      await audio.play();
      setTtsState("playing");
    } catch (error) {
      setTtsState("idle");
      setTtsErrorKey("board.detail.tts.error");
      setErrorMessage(null);
    }
  };

  if (isLoading) {
    return (
      <>
        <main className="min-h-screen bg-white">
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-28 pb-28">
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              {t("common.loading")}
            </div>
          </div>
        </main>
        <HomeFooterShortcuts />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-28 pb-28">
          <section
            aria-labelledby="board-detail-title"
            data-testid="board-detail-page"
            className="flex-1 space-y-6"
          >
            {errorMessage && (
              <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            {/* 投稿ヘッダー */}
            <header className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                  {t(categoryLabelKey)}
                </span>
                <span>{createdAtLabel}</span>
              </div>
              <h1
                id="board-detail-title"
                className="text-lg font-semibold text-gray-900"
              >
                {title}
              </h1>
              <p className="text-xs text-gray-600">{data.authorDisplayName}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  disabled={isUpdatingFavorite}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white text-xs disabled:opacity-60 ${
                    isFavorite
                      ? "border-yellow-400 text-yellow-400"
                      : "border-gray-200 text-gray-400 hover:border-yellow-300 hover:text-yellow-400"
                  }`}
                  aria-label={t(
                    isFavorite ? "board.detail.favorite.remove" : "board.detail.favorite.add",
                  )}
                >
                  <Star className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {data.isDeletable && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRequestDeletePost}
                    disabled={isPostDeleting}
                    className="mt-1 text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    {t("board.detail.post.delete")}
                  </button>
                </div>
              )}
              {favoriteErrorKey && (
                <p className="text-[11px] text-red-600">{t(favoriteErrorKey)}</p>
              )}
              {postDeleteErrorKey && (
                <p className="text-[11px] text-red-600">{t(postDeleteErrorKey)}</p>
              )}
            </header>

            {/* 本文エリア */}
            <section
              aria-label={t("board.detail.section.content")}
              className="rounded-lg border-2 border-gray-200 bg-white p-4"
            >
              <p className="whitespace-pre-wrap text-sm text-gray-800">{content}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div>
                  {canReply && (
                    <button
                      type="button"
                      onClick={handleReplyClick}
                      className="inline-flex items-center gap-1 rounded-md border-2 border-blue-200 px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50"
                      aria-label={t("board.detail.post.reply")}
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      <span>{t("board.detail.post.reply")}</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={handleTtsClick}
                    className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[11px] disabled:opacity-60 ${
                      ttsState === "playing"
                        ? "border-blue-600 text-blue-600 bg-blue-50"
                        : "border-blue-200 text-blue-600 hover:bg-blue-50"
                    }`}
                    disabled={ttsState === "loading"}
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {ttsState === "playing"
                        ? t("board.detail.tts.stop")
                        : t("board.detail.tts.play")}
                    </span>
                  </button>
                  {ttsErrorKey && (
                    <p className="text-[11px] text-red-600">{t(ttsErrorKey)}</p>
                  )}
                </div>
              </div>
            </section>

            {/* 添付ファイルリスト */}
            {data.attachments.length > 0 && (
              <section
                aria-label={t("board.detail.section.attachments")}
                className="space-y-3"
              >
                <h2 className="text-sm font-semibold text-gray-900">
                  {t("board.detail.attachments.title")}
                </h2>
                <ul className="space-y-2">
                  {data.attachments.map((file) => {
                    const isPdf = isPdfAttachment(file.fileType, file.fileName);
                    const isImage = isImageAttachment(file.fileType, file.fileName);
                    return (
                      <li
                        key={file.id}
                        className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-xs text-gray-700"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium break-words line-clamp-2">
                            {file.fileName}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {(file.fileSize / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <div className="mt-2 flex justify-end gap-2">
                          {(isPdf || isImage) && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreview({
                                  url: file.fileUrl,
                                  fileName: file.fileName,
                                  isPdf,
                                  isImage,
                                })
                              }
                              className="rounded-md border-2 border-blue-200 px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50"
                            >
                              {t("board.detail.attachments.preview")}
                            </button>
                          )}
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border-2 border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                          >
                            {t("board.detail.attachments.download")}
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* コメント一覧 */}
            <section
              aria-label={t("board.detail.section.comments")}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  {t("board.detail.comments.title")}
                </h2>
              </div>
              {deleteErrorKey && (
                <p className="text-[11px] text-red-600">{t(deleteErrorKey)}</p>
              )}
              {comments.length === 0 ? (
                <p className="text-xs text-gray-500">
                  {t("board.detail.comments.empty")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {comments.map((comment) => {
                    const translated =
                      comment.translations?.find((tr) => tr.lang === currentLocale)?.content ??
                      null;
                    const effectiveContent = translated ?? comment.content;

                    return (
                    <li
                      key={comment.id}
                      className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-xs text-gray-800"
                    >
                      <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{comment.authorDisplayName}</span>
                        <div className="flex items-center gap-2">
                          <span>{formatDateTime(comment.createdAt, currentLocale)}</span>
                          {comment.isDeletable && (
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteComment(comment.id)}
                              disabled={deletingCommentId === comment.id}
                              className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                              aria-label={t("board.detail.comment.delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap">{effectiveContent}</p>
                    </li>
                  );
                  })}
                </ul>
              )}
            </section>

          </section>
        </div>
      </main>

      <HomeFooterShortcuts />

      {/* 投稿削除確認モーダル */}
      {isPostDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[1045] flex items-center justify-center bg-transparent"
          onClick={handleCancelDeletePost}
        >
          <div
            className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-3 whitespace-pre-line">
              {t("board.detail.post.deleteConfirmMessage")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDeletePost}
                disabled={isPostDeleting}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                {t("board.detail.post.deleteConfirmNo")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePost}
                disabled={isPostDeleting}
                className="font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {t("board.detail.post.deleteConfirmYes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* コメント削除確認モーダル */}
      {confirmingCommentId && (
        <div
          className="fixed inset-0 z-[1050] flex items-center justify-center bg-transparent"
          onClick={handleCancelDeleteComment}
        >
          <div
            className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-3 whitespace-pre-line">
              {t("board.detail.comment.deleteConfirmMessage")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDeleteComment}
                disabled={deletingCommentId === confirmingCommentId}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                {t("board.detail.post.deleteConfirmNo")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteComment}
                disabled={deletingCommentId === confirmingCommentId}
                className="font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {t("board.detail.post.deleteConfirmYes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative h-[70vh] w-full max-w-md rounded-lg bg-white shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
              <h2 className="max-w-[220px] truncate text-sm font-medium text-gray-900">
                {preview.fileName}
              </h2>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label={t("board.detail.attachments.closePreview")}
              >
                ×
              </button>
            </div>
            <div className="h-full">
              {preview.isPdf ? (
                <iframe
                  src={preview.url}
                  title={preview.fileName}
                  className="h-full w-full border-0"
                />
              ) : preview.isImage ? (
                <img
                  src={preview.url}
                  alt={preview.fileName}
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BoardDetailPage;
