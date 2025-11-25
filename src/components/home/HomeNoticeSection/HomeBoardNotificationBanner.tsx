"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/src/components/common/StaticI18nProvider";

export const HomeBoardNotificationBanner: React.FC = () => {
  const { t } = useI18n();
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/board/notifications/has-unread", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) return;

        const data = (await res.json().catch(() => ({}))) as { hasUnread?: boolean };
        if (!isCancelled && typeof data.hasUnread === "boolean") {
          setHasUnread(data.hasUnread);
        }
      } catch {
        if (!isCancelled) {
          setHasUnread(false);
        }
      }
    };

    fetchUnread();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (!hasUnread) {
    return null;
  }

  return (
    <div className="mb-3 flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
      <span
        className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500"
        aria-hidden="true"
      />
      <span>{t("home.noticeSection.hasUnread")}</span>
    </div>
  );
};
