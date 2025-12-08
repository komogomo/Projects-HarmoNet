"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

export interface FacilityCompletePageProps {
  tenantId: string;
}

const FacilityCompletePage: React.FC<FacilityCompletePageProps> = ({ tenantId }) => {
  const { currentLocale } = useI18n();
  const facilityTranslations: any | null = null;
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      try {
        if (!tenantId) {
          if (!cancelled) {
            setMessages({});
          }
          return;
        }

        const params = new URLSearchParams({ tenantId, lang: currentLocale });
        const res = await fetch(
          `/api/tenant-static-translations/facility?${params.toString()}`,
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

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [tenantId, currentLocale]);

  const confirmTexts = facilityTranslations?.confirm ?? {};

  const resolveMessage = (key: string, fallback: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return fallback;
  };

  const completeTitleBase: string =
    (confirmTexts.completeTitle as string | undefined) ?? "予約が完了しました";
  const completeTitle: string = resolveMessage("confirm.completeTitle", completeTitleBase);

  const completeBodyBase: string =
    (confirmTexts.completeBody as string | undefined) ??
    "予約内容は施設予約トップやマイページからご確認いただけます。";
  const completeBody: string = resolveMessage("confirm.completeBody", completeBodyBase);

  const backLabelBase: string =
    (confirmTexts.completeBackButton as string | undefined) ?? "施設予約トップへ";
  const backLabel: string = resolveMessage("confirm.completeBackButton", backLabelBase);

  return (
    <>
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
          <section
            className="flex-1 flex flex-col items-center justify-center space-y-6"
            aria-label="facility-complete"
          >
            <div className="text-center space-y-2">
              <h1 className="text-lg font-semibold text-gray-900">{completeTitle}</h1>
              <p className="text-sm text-gray-600">{completeBody}</p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/facilities"
                className="inline-flex items-center rounded-md border-2 border-blue-600 bg-white px-4 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
              >
                {backLabel}
              </Link>
            </div>
          </section>
        </div>
      </main>
      <HomeFooterShortcuts />
    </>
  );
};

export default FacilityCompletePage;
