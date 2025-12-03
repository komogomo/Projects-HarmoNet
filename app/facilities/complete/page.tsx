"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

const FacilityCompletePage: React.FC = () => {
  const { currentLocale } = useI18n();
  const [facilityTranslations, setFacilityTranslations] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/locales/${currentLocale}/facility.json`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setFacilityTranslations(data);
        }
      } catch {
        if (!cancelled) {
          setFacilityTranslations(null);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [currentLocale]);

  const confirmTexts = facilityTranslations?.confirm ?? {};
  const completeTitle: string =
    (confirmTexts.completeTitle as string | undefined) ?? "予約が完了しました";
  const completeBody: string =
    (confirmTexts.completeBody as string | undefined) ??
    "予約内容は施設予約トップやマイページからご確認いただけます。";
  const backLabel: string =
    (confirmTexts.completeBackButton as string | undefined) ?? "施設予約トップへ";

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
