"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
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

type PdfPreviewState = {
  url: string;
  fileName: string;
} | null;

const BoardDetailPage: React.FC<BoardDetailPageProps> = ({ data }) => {
  const { t, currentLocale } = useI18n();
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewState>(null);
  const [isLoading] = useState(false);
  const [errorMessage] = useState<string | null>(null);

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
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
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
            </header>

            {/* 本文エリア */}
            <section
              aria-label={t("board.detail.section.content")}
              className="rounded-2xl border-2 border-gray-200 bg-white p-4"
            >
              <p className="whitespace-pre-wrap text-sm text-gray-800">{content}</p>
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
                    return (
                      <li
                        key={file.id}
                        className="flex items-center justify-between rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-xs text-gray-700"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{file.fileName}</span>
                          <span className="text-[11px] text-gray-500">
                            {(file.fileSize / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPdf && (
                            <button
                              type="button"
                              onClick={() =>
                                setPdfPreview({ url: file.fileUrl, fileName: file.fileName })
                              }
                              className="rounded-md border border-blue-200 px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50"
                            >
                              {t("board.detail.attachments.preview")}
                            </button>
                          )}
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
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

            {/* コメント一覧（閲覧のみ） */}
            <section
              aria-label={t("board.detail.section.comments")}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  {t("board.detail.comments.title")}
                </h2>
                <span className="text-[11px] text-gray-400">
                  {t("board.detail.comments.readonly")}
                </span>
              </div>
              {data.comments.length === 0 ? (
                <p className="text-xs text-gray-500">
                  {t("board.detail.comments.empty")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-xs text-gray-800"
                    >
                      <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{comment.authorDisplayName}</span>
                        <span>{formatDateTime(comment.createdAt, currentLocale)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{comment.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

          </section>
        </div>
      </main>

      <HomeFooterShortcuts />

      {pdfPreview && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50"
          onClick={() => setPdfPreview(null)}
        >
          <div
            className="relative h-[70vh] w-full max-w-md rounded-lg bg-white shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
              <h2 className="max-w-[220px] truncate text-sm font-medium text-gray-900">
                {pdfPreview.fileName}
              </h2>
              <button
                type="button"
                onClick={() => setPdfPreview(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label={t("board.detail.attachments.closePreview")}
              >
                ×
              </button>
            </div>
            <div className="h-full">
              <iframe
                src={pdfPreview.url}
                title={pdfPreview.fileName}
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BoardDetailPage;
