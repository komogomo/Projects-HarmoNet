"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { useTenantStaticTranslations } from "@/src/components/common/StaticI18nProvider";

interface FacilityParkingConfirmProps {
  tenantId: string;
  facilityId: string;
  facilityName: string;
  date: string;
  displayDate: string;
  startTime: string;
  endTime: string;
  slotId: string;
  slotLabel: string;
  purpose?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
}

const FacilityParkingConfirm: React.FC<FacilityParkingConfirmProps> = ({
  tenantId,
  facilityId,
  facilityName,
  date,
  displayDate,
  startTime,
  endTime,
  slotId,
  slotLabel,
  purpose,
  vehicleNumber,
  vehicleModel,
}) => {
  const { t } = useI18n();
  useTenantStaticTranslations({ tenantId, apiPath: "facility" });
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 予約日表示は数値日付のみ整形し、翻訳済みの曜日ラベルには依存しない
  const localizedDisplayDate: string = React.useMemo(() => {
    if (!date) return displayDate;

    const parts = date.split("-");
    if (parts.length !== 3) return displayDate;

    const [year, month, day] = parts;
    const mm = month.padStart(2, "0");
    const dd = day.padStart(2, "0");

    return `${year}/${mm}/${dd}`;
  }, [date, displayDate]);

  const facilityNameLabel: string = t("top.facilityName.parking");
  const heading: string = t("confirm.heading");
  const dateLabel: string = t("confirm.dateLabel");
  const timeLabel: string = t("confirm.timeLabel");
  const slotLabelText: string = t("booking.slotSectionTitle");
  const purposeLabel: string = t("confirm.purposeLabel");
  const vehicleNumberLabel: string = t("labels.vehicle_number");
  const vehicleModelLabel: string = t("labels.vehicle_model");
  const executeNotice: string = t("confirm.executeNotice");
  const submitLabel: string = t("confirm.submitButton");
  const errorMessageText: string = t("confirm.errorMessage");

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: any = {
        facilityId,
        slotId,
        date,
        startTime,
        endTime,
      };

      if (purpose && purpose.trim().length > 0) {
        payload.purpose = purpose.trim();
      }

      if (vehicleNumber && vehicleNumber.trim().length > 0) {
        payload.vehicleNumber = vehicleNumber.trim();
      }

      if (vehicleModel && vehicleModel.trim().length > 0) {
        payload.vehicleModel = vehicleModel.trim();
      }

      const res = await fetch("/api/facilities/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setSubmitError(errorMessageText);
        setIsSubmitting(false);
        return;
      }

      router.push("/facilities/complete");
    } catch {
      setSubmitError(errorMessageText);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex-1 space-y-6" aria-label="facility-confirm-parking">
      {facilityNameLabel && (
        <header className="text-center">
          <p className="text-sm font-semibold text-gray-600">{facilityNameLabel}</p>
        </header>
      )}

      <section className="space-y-3">
        <div className="rounded-lg border-2 border-gray-200 bg-white p-4 text-sm text-gray-600">
          <h2 className="mb-3 text-sm text-gray-600">{heading}</h2>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              {dateLabel}：{localizedDisplayDate}
            </p>
            <p>
              {timeLabel}：{startTime}～{endTime}
            </p>
            <p>
              {slotLabelText}：{slotLabel}
            </p>
            {purpose && <p>{purposeLabel}：</p>}
            {vehicleNumber && (
              <p>
                {vehicleNumberLabel}：{vehicleNumber}
              </p>
            )}
            {vehicleModel && (
              <p>
                {vehicleModelLabel}：{vehicleModel}
              </p>
            )}
          </div>
          {purpose && (
            <div className="mt-2 rounded-md border-2 border-gray-200 bg-white px-3 py-2 min-h-[80px]">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                {purpose}
              </p>
            </div>
          )}
          <p className="mt-4 text-xs text-gray-600">{executeNotice}</p>
        </div>

        {submitError && <p className="text-xs text-red-600">{submitError}</p>}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md border-2 border-blue-600 bg-white px-4 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-blue-200 disabled:text-blue-300"
          >
            {submitLabel}
          </button>
        </div>
      </section>
    </section>
  );
};

export default FacilityParkingConfirm;
