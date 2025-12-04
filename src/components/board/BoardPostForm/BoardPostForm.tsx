"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { BOARD_ATTACHMENT_DEFAULTS } from "@/src/lib/boardAttachmentSettings";

export type ViewerRole = "admin" | "user";
type PosterType = "management" | "general";

export interface BoardCategoryOption {
  key: string;
  label: string;
}

export interface BoardPostFormProps {
  tenantId: string;
  viewerUserId: string;
  viewerRole: ViewerRole;
  isManagementMember: boolean;
  categories: BoardCategoryOption[];
  mode?: "create" | "reply";
  replyToPostId?: string;
}

type DisplayNameMode = "anonymous" | "nickname";

type AttachmentStatus = "selected" | "uploading" | "uploaded" | "error" | "existing";

interface AttachmentItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: AttachmentStatus;
  fileObject?: File;
  fileUrl?: string;
}

interface FieldErrors {
  categoryKey?: string;
  displayNameMode?: string;
  title?: string;
  content?: string;
  attachments?: string;
}

const ATTACHMENT_SETTINGS = BOARD_ATTACHMENT_DEFAULTS;
const MAX_ATTACHMENT_SIZE_MB = ATTACHMENT_SETTINGS.maxSizePerFileBytes / (1024 * 1024);
const MAX_ATTACHMENT_COUNT =
  ATTACHMENT_SETTINGS.maxCountPerPost !== null
    ? ATTACHMENT_SETTINGS.maxCountPerPost
    : Number.MAX_SAFE_INTEGER;
// TODO: tenant_settings から添付ファイルの上限値を取得するように変更する
const ALLOWED_ATTACHMENT_MIME_TYPES = ATTACHMENT_SETTINGS.allowedMimeTypes;

const ADMIN_CATEGORY_KEYS: string[] = ["important", "circular", "event", "rules"];
const USER_CATEGORY_KEYS: string[] = ["question", "request", "group", "other"];

const BoardPostForm: React.FC<BoardPostFormProps> = ({
  tenantId,
  viewerUserId,
  viewerRole,
  isManagementMember,
  categories,
  mode,
  replyToPostId,
}) => {
  const router = useRouter();
  const { t, currentLocale } = useI18n();
  const searchParams = useSearchParams();

  const queryReplyTo = searchParams.get("replyTo");
  const effectiveReplyToPostId = replyToPostId ?? (queryReplyTo || undefined);

  const resolvedMode: "create" | "reply" =
    effectiveReplyToPostId ? "reply" : mode ?? "create";

  const isReplyMode = resolvedMode === "reply";
  const replyTo = isReplyMode ? effectiveReplyToPostId ?? null : null;
  const isTenantAdmin = viewerRole === "admin";

  const [categoryKey, setCategoryKey] = useState<string>("");
  const [displayNameMode, setDisplayNameMode] = useState<DisplayNameMode | null>(null);
  const [posterType, setPosterType] = useState<PosterType>(
    isManagementMember ? "management" : "general",
  );
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [confirmingAttachmentId, setConfirmingAttachmentId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitErrorKey, setSubmitErrorKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isMaskedMode, setIsMaskedMode] = useState<boolean>(false);
  const [forceMaskedOnNextSubmit, setForceMaskedOnNextSubmit] = useState<boolean>(false);
  const [replyAuthorType, setReplyAuthorType] = useState<"admin" | "user">(
    isTenantAdmin ? "admin" : "user",
  );
  const [replyDisplayMode, setReplyDisplayMode] = useState<"anonymous" | "nickname">(
    "nickname",
  );

  const getCategoryLabel = (category: BoardCategoryOption): string => {
    const key = `board.postForm.category.${category.key}`;
    const value = t(key);
    // t() returns the key itself when missing; fall back to DB label in that case
    return value === key ? category.label : value;
  };

  const getVisibleCategories = (): BoardCategoryOption[] => {
    const isPostingAsManagement = viewerRole === "admin" && posterType === "management";

    if (isPostingAsManagement) {
      return categories.filter((category) => ADMIN_CATEGORY_KEYS.includes(category.key));
    }

    return categories.filter((category) => USER_CATEGORY_KEYS.includes(category.key));
  };

  const visibleCategories = getVisibleCategories();

  useEffect(() => {
    const allowedKeys = new Set(visibleCategories.map((category) => category.key));
    if (categoryKey && !allowedKeys.has(categoryKey)) {
      setCategoryKey("");
    }
  }, [categoryKey, visibleCategories]);

  useEffect(() => {
    logInfo("board.post.form_open", {
      tenantId,
      viewerUserId,
      viewerRole,
    });
  }, [tenantId, viewerUserId, viewerRole]);

  useEffect(() => {
    if (viewerRole === "admin" && posterType === "management") {
      setDisplayNameMode("nickname");
    }
  }, [viewerRole, posterType]);

  const validate = (): boolean => {
    const nextErrors: FieldErrors = {};

    const isPostingAsManagement = viewerRole === "admin" && posterType === "management";

    if (!isReplyMode && !categoryKey) {
      nextErrors.categoryKey = "board.postForm.error.category.required";
    }

    if (!isReplyMode && !displayNameMode && !isPostingAsManagement) {
      nextErrors.displayNameMode = "board.postForm.error.displayName.required";
    }

    if (!isReplyMode && !title.trim()) {
      nextErrors.title = "board.postForm.error.title.required";
    }

    if (!content.trim()) {
      nextErrors.content = "board.postForm.error.content.required";
    }

    if (!isReplyMode && errors.attachments) {
      const isTooManyError =
        errors.attachments === "board.postForm.error.attachment.tooMany";

      // ファイル数上限超過は「これ以上追加できない」ことを知らせるだけで、
      // 既に添付されているファイル数が上限以内であれば送信はブロックしない。
      if (!isTooManyError) {
        nextErrors.attachments = errors.attachments;
      }
    }

    setErrors(nextErrors);
    const errorKeys = Object.keys(nextErrors);

    if (errorKeys.length > 0) {
      if (nextErrors.attachments) {
        setSubmitErrorKey("board.postForm.error.summary.attachment");
      } else {
        setSubmitErrorKey("board.postForm.error.summary.validation");
      }
      return false;
    }

    setSubmitErrorKey(null);
    return true;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setForceMaskedOnNextSubmit(false);

    logInfo("board.post.submit_click", {
      tenantId,
      viewerUserId,
      viewerRole,
      categoryKey,
      posterType,
    });

    setIsConfirmOpen(true);
  };

  const handleSubmitWithMaskedContent = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setForceMaskedOnNextSubmit(true);

    logInfo("board.post.submit_click", {
      tenantId,
      viewerUserId,
      viewerRole,
      categoryKey,
      posterType,
    });

    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitErrorKey(null);
    setIsMaskedMode(false);

    // 返信モード: /api/board/comments に投稿し、親投稿の詳細に戻す
    if (isReplyMode && replyTo) {
      try {
        const response = await fetch("/api/board/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: replyTo,
            content,
            authorType: replyAuthorType,
            displayMode: replyDisplayMode,
          }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          errorCode?: string;
        };

        if (!response.ok) {
          const errorCode = data.errorCode;
          let errorKey = "board.postForm.error.submit.server";

          if (errorCode === "auth_error" || errorCode === "unauthorized") {
            errorKey = "board.postForm.error.submit.auth";
          } else if (
            errorCode === "validation_error" ||
            errorCode === "comment_empty" ||
            errorCode === "post_not_found"
          ) {
            errorKey = "board.postForm.error.submit.validation";
          }

          setSubmitErrorKey(errorKey);
          logError("board.comment.create_failed", {
            tenantId,
            viewerUserId,
            errorCode,
          });
        } else {
          router.push(`/board/${replyTo}`);
        }
      } catch (error) {
        setSubmitErrorKey("board.postForm.error.submit.network");
        logError("board.comment.create_failed", {
          tenantId,
          viewerUserId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsSubmitting(false);
        setIsConfirmOpen(false);
      }
      return;
    }

    try {
      const formData = new FormData();
      formData.append("tenantId", tenantId);
      formData.append("authorId", viewerUserId);
      formData.append("posterType", posterType);

      // 投稿者区分を API に伝えるための authorRole（管理組合: 'admin' / 一般利用者: 'user'）
      const authorRole: "admin" | "user" =
        viewerRole === "admin" && posterType === "management" ? "admin" : "user";
      formData.append("authorRole", authorRole);
      if (displayNameMode) {
        formData.append("displayNameMode", displayNameMode);
      }
      formData.append("categoryKey", categoryKey);
      formData.append("title", title);
      formData.append("content", content);
      formData.append("forceMasked", forceMaskedOnNextSubmit ? "true" : "false");
      formData.append("uiLanguage", currentLocale);

      attachments
        .filter((attachment) => attachment.status === "selected" && attachment.fileObject)
        .forEach((attachment) => {
          formData.append("attachments", attachment.fileObject as File);
        });

      const response = await fetch("/api/board/posts", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => ({}))) as {
        postId?: string;
        errorCode?: string;
        maskedTitle?: string;
        maskedContent?: string;
      };

      if (!response.ok) {
        const errorCode = data.errorCode;
        if (errorCode === "ai_moderation_masked") {
          if (typeof data.maskedTitle === "string") {
            setTitle(data.maskedTitle);
          }
          if (typeof data.maskedContent === "string") {
            setContent(data.maskedContent);
          }
          setSubmitErrorKey("board.postForm.error.submit.moderation.masked");
          setIsMaskedMode(true);
          logError("board.post.create_failed", {
            tenantId,
            viewerUserId,
            errorCode,
          });
          return;
        }
        let errorKey = "board.postForm.error.submit.server";

        if (errorCode === "auth_error" || errorCode === "unauthorized") {
          errorKey = "board.postForm.error.submit.auth";
        } else if (
          errorCode === "validation_error" ||
          errorCode === "category_not_found" ||
          errorCode === "invalid_category"
        ) {
          errorKey = "board.postForm.error.submit.validation";
        } else if (errorCode === "ai_moderation_blocked") {
          errorKey = "board.postForm.error.submit.moderation.blocked";
        } else if (
          errorCode === "insert_failed" ||
          errorCode === "attachment_upload_failed"
        ) {
          errorKey = "board.postForm.error.submit.server";
        }

        setSubmitErrorKey(errorKey);
        logError("board.post.create_failed", {
          tenantId,
          viewerUserId,
          errorCode,
        });
      } else {
        const postId = data.postId;
        if (postId) {
          // 詳細画面はまだ未実装のため、投稿完了後は掲示板TOPに戻す。
          router.push("/board");
        }
      }
    } catch (error) {
      setSubmitErrorKey("board.postForm.error.submit.network");
      logError("board.post.create_failed", {
        tenantId,
        viewerUserId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  const handleCancelConfirm = () => {
    if (isSubmitting) return;
    setIsConfirmOpen(false);
  };

  const handleClickCancel = () => {
    router.back();
  };

  const handleSelectAttachmentFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const maxSizeBytes = ATTACHMENT_SETTINGS.maxSizePerFileBytes;
    const currentAttachments = [...attachments];
    let attachmentError: string | null = null;

    for (const file of Array.from(files)) {
      if (currentAttachments.length >= MAX_ATTACHMENT_COUNT) {
        attachmentError = "board.postForm.error.attachment.tooMany";
        // TODO: 添付ファイル数の上限超過時のエラーメッセージキーが定義されたら、ここでエラー表示を追加する
        break;
      }

      const mimeType = file.type;
      if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType)) {
        attachmentError = "board.postForm.error.attachment.invalidType";
        continue;
      }

      if (file.size > maxSizeBytes) {
        attachmentError = "board.postForm.error.attachment.tooLarge";
        continue;
      }

      currentAttachments.push({
        id: `${Date.now()}-${file.name}-${currentAttachments.length}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        status: "selected",
        fileObject: file,
      });
    }

    setAttachments(currentAttachments);

    if (attachmentError) {
      setErrors((prev) => ({
        ...prev,
        attachments: attachmentError as string,
      }));
    } else {
      setErrors((prev) => {
        if (!prev.attachments) return prev;
        const { attachments: _removed, ...rest } = prev;
        return rest;
      });
    }

    // 同じファイルを再度選択できるように value をリセット
    event.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));

    setErrors((prev) => {
      if (!prev.attachments) return prev;
      const { attachments: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleRequestRemoveAttachment = (id: string) => {
    setConfirmingAttachmentId(id);
  };

  const handleCancelRemoveAttachment = () => {
    setConfirmingAttachmentId(null);
  };

  const handleConfirmRemoveAttachment = () => {
    if (!confirmingAttachmentId) return;
    handleRemoveAttachment(confirmingAttachmentId);
    setConfirmingAttachmentId(null);
  };

  const selectedCategory = categories.find((c) => c.key === categoryKey) ?? null;
  const selectedCategoryLabel = selectedCategory ? getCategoryLabel(selectedCategory) : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="board-post-form">
      {submitErrorKey && (
        <div
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          data-testid="board-post-form-error-summary"
        >
          {t(submitErrorKey)}
        </div>
      )}

      {confirmingAttachmentId && (
        <div
          className="fixed inset-0 z-[950] flex items-center justify-center bg-transparent"
          onClick={handleCancelRemoveAttachment}
        >
          <div
            className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-600 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-3 whitespace-pre-line">
              {t("board.detail.comment.deleteConfirmMessage")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelRemoveAttachment}
                className="text-gray-400 hover:text-gray-600"
              >
                {t("board.detail.post.deleteConfirmNo")}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveAttachment}
                className="text-red-500 hover:text-red-600"
              >
                {t("board.detail.post.deleteConfirmYes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isReplyMode && isManagementMember && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            {t("board.postForm.field.posterType.label")}
          </div>
          <div className="flex gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="posterType"
                value="management"
                checked={posterType === "management"}
                onChange={() => setPosterType("management")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{t("board.postForm.option.posterType.management")}</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="posterType"
                value="general"
                checked={posterType === "general"}
                onChange={() => setPosterType("general")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{t("board.postForm.option.posterType.general")}</span>
            </label>
          </div>
        </div>
      )}

      {!isReplyMode && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            {t("board.postForm.field.category.label")}
            <select
              className="mt-1 block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={categoryKey}
              onChange={(event) => setCategoryKey(event.target.value)}
              data-testid="board-post-form-category"
            >
              <option value="">{t("board.postForm.field.category.placeholder")}</option>
              {visibleCategories.map((category) => (
                <option key={category.key} value={category.key}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
          {errors.categoryKey && (
            <p className="mt-1 text-xs text-red-600">{t(errors.categoryKey)}</p>
          )}
        </div>
      )}

      {!isReplyMode && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            {t("board.postForm.field.displayName.label")}
          </div>
          {viewerRole === "admin" && posterType === "management" ? (
            <div className="text-sm text-gray-600">{t("board.authorType.admin")}</div>
          ) : (
            <>
              <div className="flex gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="displayNameMode"
                    value="anonymous"
                    checked={displayNameMode === "anonymous"}
                    onChange={() => setDisplayNameMode("anonymous")}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    data-testid="board-post-form-displayname-anonymous"
                  />
                  <span>{t("board.postForm.option.anonymous")}</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="displayNameMode"
                    value="nickname"
                    checked={displayNameMode === "nickname"}
                    onChange={() => setDisplayNameMode("nickname")}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    data-testid="board-post-form-displayname-nickname"
                  />
                  <span>{t("board.postForm.option.nickname")}</span>
                </label>
              </div>
              {errors.displayNameMode && (
                <p className="mt-1 text-xs text-red-600">{t(errors.displayNameMode)}</p>
              )}
            </>
          )}
        </div>
      )}

      {!isReplyMode && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              {t("board.postForm.field.title.label")}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </span>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-2 border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid="board-post-form-title"
              required
              aria-required="true"
            />
          </label>
          {errors.title && <p className="mt-1 text-xs text-red-600">{t(errors.title)}</p>}
        </div>
      )}

      {isReplyMode && isTenantAdmin && (
        <section className="space-y-2">
          <div className="text-sm text-gray-600">
            {t("board.postForm.field.posterType.label")}
          </div>
          <div className="flex gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="replyAuthorType"
                value="admin"
                checked={replyAuthorType === "admin"}
                onChange={() => setReplyAuthorType("admin")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{t("board.postForm.option.posterType.management")}</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="replyAuthorType"
                value="user"
                checked={replyAuthorType === "user"}
                onChange={() => setReplyAuthorType("user")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{t("board.postForm.option.posterType.general")}</span>
            </label>
          </div>
        </section>
      )}

      {isReplyMode && (
        <section className="space-y-2">
          <div className="text-sm text-gray-600">
            {t("board.postForm.field.displayName.label")}
          </div>
          {isTenantAdmin && replyAuthorType === "admin" ? (
            <p className="text-sm text-gray-600">
              {t("board.postForm.field.displayName.label")}：{t("board.authorType.admin")}
            </p>
          ) : (
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="replyDisplayMode"
                  value="anonymous"
                  checked={replyDisplayMode === "anonymous"}
                  onChange={() => setReplyDisplayMode("anonymous")}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{t("board.postForm.option.anonymous")}</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="replyDisplayMode"
                  value="nickname"
                  checked={replyDisplayMode === "nickname"}
                  onChange={() => setReplyDisplayMode("nickname")}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{t("board.postForm.option.nickname")}</span>
              </label>
            </div>
          )}
        </section>
      )}

      <div className="space-y-2">
        <label className="block text-sm text-gray-600">
          <span className="inline-flex items-center gap-1">
            {t("board.postForm.field.content.label")}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </span>
          <textarea
            className="mt-1 block w-full min-h-[160px] rounded-md border-2 border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            data-testid="board-post-form-content"
            required
            aria-required="true"
          />
        </label>
        {errors.content && <p className="mt-1 text-xs text-red-600">{t(errors.content)}</p>}
      </div>

      {!isReplyMode && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            {t("board.postForm.section.attachment")}
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <p>{t("board.postForm.note.attachment.description")}</p>
            <p>{t("board.postForm.note.attachment.attachmentAllowed")}</p>
            <p>{t("board.postForm.note.attachment.sizeLimit")}</p>
            <p>{t("board.postForm.note.attachment.previewNote")}</p>
          </div>
          <div className="rounded-lg border-2 border-gray-200 bg-white p-3 text-xs text-gray-600">
            <div className="mb-2 flex justify-start">
              <label
                htmlFor="board-post-form-attachment-input"
                className="inline-flex cursor-pointer items-center rounded-md border-2 border-gray-300 bg-white px-2.5 py-1 text-[11px] text-blue-600 hover:bg-gray-50"
              >
                {t("board.postForm.button.attachFile")}
              </label>
              <input
                id="board-post-form-attachment-input"
                type="file"
                multiple
                accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(",")}
                className="hidden"
                onChange={handleSelectAttachmentFile}
                data-testid="board-post-form-attachment-input"
              />
            </div>
            {attachments.length > 0 && (
              <ul className="space-y-1">
                {attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="flex items-center justify-between rounded border-2 border-gray-200 px-2 py-1"
                  >
                    <div className="min-w-0">
                      <span className="block truncate">{attachment.fileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRequestRemoveAttachment(attachment.id)}
                      className="flex h-5 w-5 items-center justify-center text-[16px] text-red-500 hover:text-red-600"
                      aria-label={t("common.cancel")}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {errors.attachments && (
            <p className="mt-1 text-xs text-red-600">{t(errors.attachments)}</p>
          )}
        </div>
      )}

      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={handleClickCancel}
          className="rounded-md border-2 border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {t("board.postForm.button.cancel")} 
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md border-2 border-blue-200 bg-white px-4 py-2 text-sm text-blue-600 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="board-post-form-submit-button"
        >
          {isSubmitting ? t("board.postForm.button.submitting") : t("board.postForm.button.submit")}
        </button>
        {isMaskedMode && (
          <button
            type="button"
            onClick={handleSubmitWithMaskedContent}
            disabled={isSubmitting}
            className="rounded-md bg-yellow-500 px-4 py-2 text-sm text-white shadow-sm hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="board-post-form-submit-masked-button"
          >
            {t("board.postForm.button.submitMasked")}
          </button>
        )}
      </div>

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40"
          data-testid="board-post-form-confirm"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
            <div className="space-y-3">
              <h2 className="text-lg text-gray-600">
                {t("board.postForm.confirm.submit.title")}
              </h2>
              <p className="text-sm text-gray-600">
                {t("board.postForm.confirm.submit.notice")}
              </p>
              <div className="space-y-2 rounded-md border-2 border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                <div>
                  <div>
                    {t("board.postForm.confirm.preview.title")}
                  </div>
                  <div>{title}</div>
                </div>
                {!isReplyMode && (
                  <div>
                    <div>
                      {t("board.postForm.confirm.preview.category")}
                    </div>
                    <div>{selectedCategoryLabel}</div>
                  </div>
                )}
                <div>
                  <div>
                    {t("board.postForm.confirm.preview.content")}
                  </div>
                  <div className="whitespace-pre-wrap">
                    {content.length > 200 ? `${content.slice(0, 200)}...` : content}
                  </div>
                </div>
                {attachments.length > 0 && (
                  <div>
                    <div>
                      {t("board.postForm.confirm.preview.attachment")}
                    </div>
                    <ul className="list-disc pl-5">
                      {attachments.map((attachment) => (
                        <li key={attachment.id}>{attachment.fileName}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  disabled={isSubmitting}
                  className="rounded-md border-2 border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("board.postForm.confirm.submit.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="rounded-md border-2 border-blue-200 bg-white px-4 py-2 text-sm text-blue-600 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="board-post-form-confirm-ok"
                >
                  {isSubmitting
                    ? t("board.postForm.button.submitting")
                    : t("board.postForm.confirm.submit.ok")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default BoardPostForm;
