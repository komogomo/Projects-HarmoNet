"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Languages, MessageCircle, Star, Trash2, Volume2 } from "lucide-react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";
import { BOARD_ATTACHMENT_DEFAULTS } from "@/src/lib/boardAttachmentSettings";
import type { BoardPostDetailDto } from "@/src/server/board/getBoardPostById";
import type { BoardCategoryKey } from "@/src/components/board/BoardTop/types";

interface BoardDetailPageProps {
  data: BoardPostDetailDto;
  tenantName?: string;
  tenantId: string;
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

const ATTACHMENT_SETTINGS = BOARD_ATTACHMENT_DEFAULTS;
const MAX_ATTACHMENT_SIZE_BYTES = ATTACHMENT_SETTINGS.maxSizePerFileBytes;
const MAX_ATTACHMENT_COUNT =
  ATTACHMENT_SETTINGS.maxCountPerPost !== null
    ? ATTACHMENT_SETTINGS.maxCountPerPost
    : Number.MAX_SAFE_INTEGER;
const ALLOWED_ATTACHMENT_MIME_TYPES = ATTACHMENT_SETTINGS.allowedMimeTypes;

type AttachmentPreviewState = {
  url: string;
  fileName: string;
  isPdf: boolean;
  isImage: boolean;
} | null;

const BoardDetailPage: React.FC<BoardDetailPageProps> = ({ data, tenantName, tenantId }) => {
  const { currentLocale } = useI18n();
  const router = useRouter();
  const [preview, setPreview] = useState<AttachmentPreviewState>(null);
  const [postData, setPostData] = useState(data);
  const [attachments, setAttachments] = useState(data.attachments);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [confirmingAttachmentId, setConfirmingAttachmentId] = useState<string | null>(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [attachmentErrorKey, setAttachmentErrorKey] = useState<string | null>(null);
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationErrorKey, setTranslationErrorKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [isApproving, setIsApproving] = useState(false);
  const [approvalErrorKey, setApprovalErrorKey] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishErrorKey, setPublishErrorKey] = useState<string | null>(null);

  const {
    categoryKey,
    categoryLabelKey,
    title,
    content,
    createdAtLabel,
  } = useMemo(() => {
    const translation = postData.translations.find((tr) => tr.lang === currentLocale);

    const effectiveTitle =
      translation && translation.title && translation.title.trim().length > 0
        ? translation.title
        : postData.originalTitle;

    const effectiveContent = translation?.content ?? postData.originalContent;

    const mappedCategoryKey = resolveCategoryKey(postData.categoryKey);
    const labelKey = CATEGORY_LABEL_MAP[mappedCategoryKey] ?? CATEGORY_LABEL_MAP.other;

    const createdAt = formatDateTime(postData.createdAt, currentLocale);

    return {
      categoryKey: mappedCategoryKey,
      categoryLabelKey: labelKey,
      title: effectiveTitle,
      content: effectiveContent,
      createdAtLabel: createdAt,
    };
  }, [postData, currentLocale]);

  const isManagementPost = useMemo(() => postData.authorRole === "management", [postData.authorRole]);
  const isPending = useMemo(() => postData.status === "pending", [postData.status]);
  const isAdminViewer = postData.viewerRole === "admin";
  const isAuthor = postData.isAuthor;
  const approvalCount = postData.approvalCount;
  const hasApprovedByCurrentUser = postData.hasApprovedByCurrentUser;
  const approvalRequiredCount = 2;

  const canApprove =
    isManagementPost &&
    isPending &&
    isAdminViewer &&
    !hasApprovedByCurrentUser &&
    !isApproving;

  const canPublish =
    isManagementPost &&
    isPending &&
    isAuthor &&
    approvalCount >= approvalRequiredCount &&
    !isPublishing;

  const canReply = useMemo(() => {
    const forbidden: BoardCategoryKey[] = ["important", "circular", "event", "rules"];
    return !forbidden.includes(categoryKey);
  }, [categoryKey]);

  const selectedPreviewableAttachment = useMemo(() => {
    if (selectedAttachmentIds.length !== 1) {
      return null;
    }

    const id = selectedAttachmentIds[0];
    const file = attachments.find((attachment) => attachment.id === id);
    if (!file) {
      return null;
    }

    const isPdf = isPdfAttachment(file.fileType, file.fileName);
    const isImage = isImageAttachment(file.fileType, file.fileName);

    if (!isPdf && !isImage) {
      return null;
    }

    return { file, isPdf, isImage };
  }, [selectedAttachmentIds, attachments]);

  useEffect(() => {
    if (!tenantId) {
      setMessages({});
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const params = new URLSearchParams({ tenantId, lang: currentLocale });
        const res = await fetch(
          `/api/tenant-static-translations/board-detail?${params.toString()}`,
        );

        if (!res.ok) {
          if (!cancelled) {
            setMessages({});
          }
          return;
        }

        const data = (await res.json().catch(() => ({}))) as {
          messages?: Record<string, string>;
        };

        if (!cancelled && data && data.messages && typeof data.messages === "object") {
          setMessages(data.messages);
        }
      } catch {
        if (!cancelled) {
          setMessages({});
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [tenantId, currentLocale]);

  const resolveMessage = (key: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return key;
  };

  // 通知の既読更新: 詳細画面（特定の投稿）を開いた時点で mark-seen API を呼び出す
  useEffect(() => {
    const markSeen = async () => {
      try {
        const res = await fetch("/api/board/notifications/mark-seen", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ postId: data.id }),
        });
        if (res.ok && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("harmonet:board-notification-seen", {
              detail: { postId: data.id },
            }),
          );
        }
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

  const handleApproveClick = async () => {
    if (!canApprove) return;

    setIsApproving(true);
    setApprovalErrorKey(null);

    try {
      const res = await fetch(`/api/board/posts/${data.id}/approve`, {
        method: "POST",
      });

      const json = (await res.json().catch(() => ({}))) as {
        approvalCount?: number;
        hasApprovedByCurrentUser?: boolean;
        errorCode?: string;
      };

      if (!res.ok) {
        throw new Error(json.errorCode ?? "board.detail.approval.error");
      }

      setPostData((prev) => ({
        ...prev,
        approvalCount:
          typeof json.approvalCount === "number" ? json.approvalCount : prev.approvalCount,
        hasApprovedByCurrentUser:
          typeof json.hasApprovedByCurrentUser === "boolean"
            ? json.hasApprovedByCurrentUser
            : true,
      }));
    } catch {
      setApprovalErrorKey("board.detail.approval.error");
    } finally {
      setIsApproving(false);
    }
  };

  const handlePublishClick = async () => {
    if (!canPublish) return;

    setIsPublishing(true);
    setPublishErrorKey(null);

    try {
      const res = await fetch(`/api/board/posts/${data.id}/publish`, {
        method: "POST",
      });

      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        errorCode?: string;
      };

      if (!res.ok) {
        throw new Error(json.errorCode ?? "board.detail.publish.error");
      }

      const nextStatus =
        json.status === "draft" ||
        json.status === "pending" ||
        json.status === "archived" ||
        json.status === "published"
          ? (json.status as "draft" | "pending" | "published" | "archived")
          : "published";

      setPostData((prev) => ({
        ...prev,
        status: nextStatus,
      }));
    } catch {
      setPublishErrorKey("board.detail.publish.error");
    } finally {
      setIsPublishing(false);
    }
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

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, status: "deleted", isDeletable: false }
            : comment,
        ),
      );
      setConfirmingCommentId(null);
    } catch {
      setDeleteErrorKey("board.detail.comment.deleteError");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleToggleSelectAllAttachments = () => {
    if (selectedAttachmentIds.length === attachments.length) {
      setSelectedAttachmentIds([]);
    } else {
      setSelectedAttachmentIds(attachments.map((attachment) => attachment.id));
    }
  };

  const handleToggleAttachmentSelection = (id: string) => {
    setSelectedAttachmentIds((prev) =>
      prev.includes(id) ? prev.filter((existingId) => existingId !== id) : [...prev, id],
    );
  };

  const handlePreviewSelectedAttachments = () => {
    if (!selectedPreviewableAttachment) {
      return;
    }

    const { file, isPdf, isImage } = selectedPreviewableAttachment;

    setPreview({
      url: file.fileUrl,
      fileName: file.fileName,
      isPdf,
      isImage,
    });
  };

  const handleDownloadSelectedAttachments = () => {
    if (selectedAttachmentIds.length === 0) {
      return;
    }

    selectedAttachmentIds.forEach((id) => {
      const attachment = attachments.find((file) => file.id === id);
      if (!attachment) {
        return;
      }

      const link = document.createElement("a");
      link.href = attachment.fileUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
    });
  };

  const handleRequestDeleteAttachment = (attachmentId: string) => {
    if (!data.isDeletable) return;
    if (deletingAttachmentId) return;

    setConfirmingAttachmentId(attachmentId);
    setAttachmentErrorKey(null);
  };

  const handleCancelDeleteAttachment = () => {
    if (deletingAttachmentId) return;
    setConfirmingAttachmentId(null);
  };

  const handleConfirmDeleteAttachment = async () => {
    if (!confirmingAttachmentId || deletingAttachmentId) return;

    const targetId = confirmingAttachmentId;
    await handleDeleteAttachment(targetId);
    setConfirmingAttachmentId(null);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!data.isDeletable) return;
    if (deletingAttachmentId === attachmentId) return;

    setDeletingAttachmentId(attachmentId);
    setAttachmentErrorKey(null);

    try {
      const response = await fetch(`/api/board/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      const json = (await response.json().catch(() => ({}))) as { errorCode?: string };

      if (!response.ok) {
        throw new Error(json.errorCode ?? "attachment_delete_failed");
      }

      setAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
      setSelectedAttachmentIds((prev) => prev.filter((id) => id !== attachmentId));
    } catch {
      setAttachmentErrorKey("board.postForm.error.submit.server");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleAddAttachmentFiles = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!data.isDeletable) return;

    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const existingCount = attachments.length;
    const selectedFiles: File[] = [];
    let errorKey: string | null = null;

    for (const file of Array.from(files)) {
      if (existingCount + selectedFiles.length >= MAX_ATTACHMENT_COUNT) {
        errorKey = "board.postForm.error.attachment.tooMany";
        break;
      }

      if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
        errorKey = "board.postForm.error.attachment.invalidType";
        continue;
      }

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        errorKey = "board.postForm.error.attachment.tooLarge";
        continue;
      }

      selectedFiles.push(file);
    }

    // 同じファイルを再度選択できるように value をリセット
    event.target.value = "";

    if (errorKey) {
      setAttachmentErrorKey(errorKey);
    } else {
      setAttachmentErrorKey(null);
    }

    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploadingAttachments(true);

    try {
      const formData = new FormData();
      formData.append("postId", data.id);
      selectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch("/api/board/attachments", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json().catch(() => ({}))) as {
        attachments?: {
          id: string;
          fileName: string;
          fileType: string;
          fileSize: number;
          fileUrl: string;
        }[];
        errorCode?: string;
      };

      const nextAttachments = json.attachments ?? [];

      if (!response.ok || nextAttachments.length === 0) {
        throw new Error(json.errorCode ?? "attachment_upload_failed");
      }

      setAttachments((prev) => [...prev, ...nextAttachments]);
    } catch {
      setAttachmentErrorKey("board.postForm.error.submit.server");
    } finally {
      setIsUploadingAttachments(false);
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

  const handleTranslate = async () => {
    if (isTranslating) return;

    setIsTranslating(true);
    setTranslationErrorKey(null);

    const targetLang = currentLocale === "en" ? "en" : currentLocale === "zh" ? "zh" : "ja";

    try {
      const res = await fetch("/api/board/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postData.id,
          targetLang,
        }),
      });

      if (!res.ok) {
        throw new Error("translation_failed");
      }

      const json = await res.json();

      setPostData((prev) => ({
        ...prev,
        translations: [
          ...prev.translations.filter((t) => t.lang !== targetLang),
          {
            lang: targetLang,
            title: json.title,
            content: json.content,
          },
        ],
      }));
    } catch {
      setTranslationErrorKey("board.detail.i18n.error");
    } finally {
      setIsTranslating(false);
    }
  };

  const hasTranslation = useMemo(() => {
    return postData.translations.some((t) => t.lang === currentLocale);
  }, [postData.translations, currentLocale]);

  const isSourceLang = useMemo(() => {
    return postData.sourceLang === currentLocale;
  }, [postData.sourceLang, currentLocale]);

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
        <main className="min-h-screen bg-white pb-24">
          <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
            <div className="flex-1 flex items-center justify-center text-sm text-gray-600">
              {resolveMessage("board.detail.loading")}
            </div>
          </div>
        </main>
        <HomeFooterShortcuts />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-white pb-24">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
          <section
            aria-labelledby="board-detail-title"
            data-testid="board-detail-page"
            className="flex-1 space-y-6"
          >
            {tenantName && (
              <div className="mb-1 flex justify-center">
                <p className="max-w-full truncate text-base text-gray-600">
                  {tenantName}
                </p>
              </div>
            )}
            {errorMessage && (
              <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            {/* 投稿ヘッダー */}
            <header className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-gray-600">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-blue-700">
                  {resolveMessage(categoryLabelKey)}
                </span>
                <span>{createdAtLabel}</span>
              </div>
              <h1
                id="board-detail-title"
                className="text-lg text-gray-600"
              >
                {title}
              </h1>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">{data.authorDisplayName}</p>
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  disabled={isUpdatingFavorite}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white text-xs disabled:opacity-60 ${isFavorite
                    ? "border-yellow-400 text-yellow-400"
                    : "border-gray-200 text-gray-400 hover:border-yellow-300 hover:text-yellow-400"
                    }`}
                  aria-label={resolveMessage(
                    isFavorite ? "board.detail.favorite.remove" : "board.detail.favorite.add",
                  )}
                >
                  <Star className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {/* お気に入りボタンは本文カード内の右上に移動 */}
              {favoriteErrorKey && (
                <p className="text-[11px] text-red-600">{resolveMessage(favoriteErrorKey)}</p>
              )}
              {postDeleteErrorKey && (
                <p className="text-[11px] text-red-600">{resolveMessage(postDeleteErrorKey)}</p>
              )}
              {approvalErrorKey && (
                <p className="text-[11px] text-red-600">{resolveMessage(approvalErrorKey)}</p>
              )}
              {publishErrorKey && (
                <p className="text-[11px] text-red-600">{resolveMessage(publishErrorKey)}</p>
              )}
            </header>

            {/* 本文エリア */}
            <section
              aria-label={resolveMessage("board.detail.section.content")}
              className="rounded-lg border-2 border-gray-200 bg-white px-3 pt-4 pb-2"
            >
              {/* 上段: 本文 + 右上のお気に入りボタン */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="whitespace-pre-wrap text-sm text-gray-600">{content}</p>
                </div>
              </div>

              {/* 下段: 左に削除ボタン、右に返信/翻訳/読み上げボタン群 */}
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {data.isDeletable && (
                    <button
                      type="button"
                      onClick={handleRequestDeletePost}
                      disabled={isPostDeleting}
                      className="inline-flex items-center rounded-md border-2 border-red-200 bg-white px-3 py-1 text-[11px] text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      {resolveMessage("board.detail.post.delete")}
                    </button>
                  )}

                  {isManagementPost && isAdminViewer && (
                    <>
                      <button
                        type="button"
                        onClick={handleApproveClick}
                        disabled={!canApprove}
                        className="inline-flex items-center rounded-md border-2 border-gray-800 bg-white px-3 py-1 text-[11px] text-gray-800 hover:bg-gray-50 disabled:opacity-40"
                      >
                        {resolveMessage("board.detail.post.approve")}
                      </button>
                      <span className="text-[11px] text-gray-600">
                        {isPending
                          ? approvalCount >= approvalRequiredCount
                            ? resolveMessage("board.detail.post.approvalCompleted")
                            : resolveMessage("board.detail.post.approvalPending")
                          : resolveMessage("board.detail.post.published")}
                      </span>
                      {canPublish && (
                        <button
                          type="button"
                          onClick={handlePublishClick}
                          disabled={!canPublish}
                          className="inline-flex items-center rounded-md border-2 border-blue-600 bg-white px-3 py-1 text-[11px] text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                        >
                          {resolveMessage("board.detail.post.publish")}
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  {canReply && (
                    <button
                      type="button"
                      onClick={handleReplyClick}
                      className="inline-flex items-center gap-1 rounded-md border-2 border-blue-200 px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50"
                      aria-label={resolveMessage("board.detail.post.reply")}
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      <span>{resolveMessage("board.detail.post.reply")}</span>
                    </button>
                  )}

                  {!isSourceLang && (
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={handleTranslate}
                        disabled={hasTranslation || isTranslating}
                        className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[11px] disabled:opacity-60 ${hasTranslation || isTranslating
                          ? "border-gray-200 bg-gray-100 text-gray-400"
                          : "border-blue-200 text-blue-600 hover:bg-blue-50"
                          }`}
                      >
                        <Languages className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {isTranslating
                            ? resolveMessage("board.detail.i18n.translating")
                            : resolveMessage("board.detail.i18n.translate")}
                        </span>
                      </button>
                      {translationErrorKey && (
                        <p className="text-[11px] text-red-600">{resolveMessage(translationErrorKey)}</p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={handleTtsClick}
                      className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[11px] disabled:opacity-60 ${ttsState === "playing"
                        ? "border-blue-600 text-blue-600 bg-blue-50"
                        : "border-blue-200 text-blue-600 hover:bg-blue-50"
                        }`}
                      disabled={ttsState === "loading"}
                    >
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {ttsState === "playing"
                          ? resolveMessage("board.detail.tts.stop")
                          : resolveMessage("board.detail.tts.play")}
                      </span>
                    </button>
                    {ttsErrorKey && (
                      <p className="text-[11px] text-red-600">{resolveMessage(ttsErrorKey)}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 添付ファイルリスト */}
            {(attachments.length > 0 || data.isDeletable) && (
              <section
                aria-label={resolveMessage("board.detail.section.attachments")}
                className="space-y-3"
              >
                <div className="rounded-lg border-2 border-gray-200 bg-white p-3 text-xs text-gray-600">
                  {attachments.length > 0 && (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 text-[11px] text-gray-600">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={
                              attachments.length > 0 &&
                              selectedAttachmentIds.length === attachments.length
                            }
                            onChange={handleToggleSelectAllAttachments}
                          />
                          <span>
                            {currentLocale === "en"
                              ? "Select all"
                              : currentLocale === "zh"
                                ? "全选"
                                : "すべて選択"}
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          {data.isDeletable && (
                            <>
                              <label
                                htmlFor="board-detail-attachment-input"
                                className="inline-flex cursor-pointer items-center rounded-md border-2 border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-600 hover:border-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed"
                              >
                                {isUploadingAttachments
                                  ? resolveMessage("board.detail.attachments.uploading")
                                  : resolveMessage("board.detail.attachments.attachFile")}
                              </label>
                              <input
                                id="board-detail-attachment-input"
                                type="file"
                                multiple
                                accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(",")}
                                className="hidden"
                                onChange={handleAddAttachmentFiles}
                                disabled={
                                  isUploadingAttachments ||
                                  attachments.length >= MAX_ATTACHMENT_COUNT
                                }
                              />
                            </>
                          )}
                          <button
                            type="button"
                            onClick={handlePreviewSelectedAttachments}
                            disabled={!selectedPreviewableAttachment}
                            className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[11px] disabled:cursor-not-allowed ${!selectedPreviewableAttachment
                              ? "border-gray-200 bg-gray-100 text-gray-400"
                              : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                              }`}
                          >
                            {resolveMessage("board.detail.attachments.preview")}
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadSelectedAttachments}
                            disabled={selectedAttachmentIds.length === 0}
                            className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[11px] disabled:cursor-not-allowed ${selectedAttachmentIds.length === 0
                              ? "border-gray-200 bg-gray-100 text-gray-400"
                              : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                              }`}
                          >
                            {resolveMessage("board.detail.attachments.download")}
                          </button>
                        </div>
                      </div>
                      <ul className="max-h-40 space-y-1 overflow-y-auto pr-1">
                        {attachments.map((file) => {
                          const isPdf = isPdfAttachment(file.fileType, file.fileName);
                          const isImage = isImageAttachment(file.fileType, file.fileName);
                          const isSelected = selectedAttachmentIds.includes(file.id);
                          return (
                            <li
                              key={file.id}
                              className="flex items-center justify-between rounded border-2 border-gray-200 px-2 py-1"
                            >
                              <label className="flex flex-1 items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  checked={isSelected}
                                  onChange={() => handleToggleAttachmentSelection(file.id)}
                                />
                                <div className="min-w-0">
                                  <span className="block truncate">
                                    {file.fileName}
                                  </span>
                                </div>
                              </label>
                              <div className="ml-2 flex items-center gap-2">
                                {data.isDeletable && (
                                  <button
                                    type="button"
                                    onClick={() => handleRequestDeleteAttachment(file.id)}
                                    disabled={
                                      deletingAttachmentId === file.id || isUploadingAttachments
                                    }
                                    className="flex h-5 w-5 items-center justify-center text-[16px] text-red-500 hover:text-red-600 disabled:opacity-40"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  {attachmentErrorKey && (
                    <p className="mt-2 text-[11px] text-red-600">{resolveMessage(attachmentErrorKey)}</p>
                  )}
                </div>
              </section>
            )}

            {/* コメント一覧 */}
            <section
              aria-label={resolveMessage("board.detail.section.comments")}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm text-gray-600">
                  {resolveMessage("board.detail.comments.title")}
                </h2>
              </div>
              {deleteErrorKey && (
                <p className="text-[11px] text-red-600">{resolveMessage(deleteErrorKey)}</p>
              )}
              {comments.length === 0 ? (
                <p className="text-xs text-gray-600">
                  {resolveMessage("board.detail.comments.empty")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {comments.map((comment) => {
                    const isDeleted = comment.status === "deleted";
                    const baseTimestamp = isDeleted
                      ? comment.updatedAt ?? comment.createdAt
                      : comment.createdAt;
                    const timeLabel = formatDateTime(baseTimestamp, currentLocale);

                    const translated = !isDeleted
                      ? comment.translations?.find((tr) => tr.lang === currentLocale)?.content ??
                      null
                      : null;

                    const effectiveContent = isDeleted
                      ? `${timeLabel} ${resolveMessage("board.comment.deleted")}`
                      : translated ?? comment.content;

                    return (
                      <li
                        key={comment.id}
                        className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-xs text-gray-600"
                      >
                        <div className="mb-1 flex items-center justify-between text-[11px] text-gray-600">
                          <span>{comment.authorDisplayName}</span>
                          <div className="flex items-center gap-2">
                            <span>{timeLabel}</span>
                            {comment.isDeletable && comment.status !== "deleted" && (
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteComment(comment.id)}
                                disabled={deletingCommentId === comment.id}
                                className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                                aria-label={resolveMessage("board.detail.comment.delete")}
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
      {
        isPostDeleteConfirmOpen && (
          <div
            className="fixed inset-0 z-[1045] flex items-center justify-center bg-transparent"
            onClick={handleCancelDeletePost}
          >
            <div
              className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="mb-3 whitespace-pre-line">
                {resolveMessage("board.detail.post.deleteConfirmMessage")}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelDeletePost}
                  disabled={isPostDeleting}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {resolveMessage("board.detail.post.deleteConfirmNo")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePost}
                  disabled={isPostDeleting}
                  className="text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  {resolveMessage("board.detail.post.deleteConfirmYes")}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 添付ファイル削除確認モーダル */}
      {
        confirmingAttachmentId && (
          <div
            className="fixed inset-0 z-[1042] flex items-center justify-center bg-transparent"
            onClick={handleCancelDeleteAttachment}
          >
            <div
              className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="mb-3 whitespace-pre-line">
                {resolveMessage("board.detail.comment.deleteConfirmMessage")}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelDeleteAttachment}
                  disabled={deletingAttachmentId === confirmingAttachmentId}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {resolveMessage("board.detail.post.deleteConfirmNo")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAttachment}
                  disabled={deletingAttachmentId === confirmingAttachmentId}
                  className="text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  {resolveMessage("board.detail.post.deleteConfirmYes")}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* コメント削除確認モーダル */}
      {
        confirmingCommentId && (
          <div
            className="fixed inset-0 z-[1050] flex items-center justify-center bg-transparent"
            onClick={handleCancelDeleteComment}
          >
            <div
              className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="mb-3 whitespace-pre-line">
                {resolveMessage("board.detail.comment.deleteConfirmMessage")}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelDeleteComment}
                  disabled={deletingCommentId === confirmingCommentId}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {resolveMessage("board.detail.post.deleteConfirmNo")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteComment}
                  disabled={deletingCommentId === confirmingCommentId}
                  className="text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  {resolveMessage("board.detail.post.deleteConfirmYes")}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        preview && (
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50"
            onClick={() => setPreview(null)}
          >
            <div
              className="relative h-[70vh] w-full max-w-md rounded-lg bg-white shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
                <h2 className="max-w-[220px] truncate text-sm text-gray-900">
                  {preview.fileName}
                </h2>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label={resolveMessage("board.detail.attachments.closePreview")}
                >
                  ×
                </button>
              </div>
              <div className="h-full">
                {preview.isPdf ? (
                  <iframe
                    src={preview.url}
                    title={preview.fileName}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.url}
                      alt={preview.fileName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
    </>
  );
};

export default BoardDetailPage;
