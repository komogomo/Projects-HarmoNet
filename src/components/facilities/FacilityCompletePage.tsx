"use client";

import React from "react";
import Link from "next/link";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { useTenantStaticTranslations } from "@/src/components/common/StaticI18nProvider";

export interface FacilityCompletePageProps {
  tenantId: string;
}

const FacilityCompletePage: React.FC<FacilityCompletePageProps> = ({ tenantId }) => {
  const { t } = useI18n();
  useTenantStaticTranslations({ tenantId, apiPath: "facility" });

  const completeTitle: string = t("confirm.completeTitle");
  const completeBody: string = t("confirm.completeBody");
  const backLabel: string = t("confirm.completeBackButton");

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
