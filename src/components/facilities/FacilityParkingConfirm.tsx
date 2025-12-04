"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

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
  const { currentLocale } = useI18n();
  const router = useRouter();

  const [facilityTranslations, setFacilityTranslations] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

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

  // 予約日表示をロケールに合わせて整形（曜日ラベルは facility.json の weekdays を利用）
  const localizedDisplayDate: string = React.useMemo(() => {
    if (!date) return displayDate;

    const parts = date.split("-");
    if (parts.length !== 3) return displayDate;

    const [year, month, day] = parts;
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);

    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return displayDate;

    const mm = month.padStart(2, "0");
    const dd = day.padStart(2, "0");

    const weekdaysMap = (facilityTranslations?.top?.weekdays ?? null) as
      | Record<string, string>
      | null;

    let w = "";
    if (weekdaysMap) {
      const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const idx = dt.getDay();
      const key = weekdayKeys[idx];
      const value = weekdaysMap[key];
      if (typeof value === "string") {
        w = value;
      }
    }

    if (currentLocale === "ja") {
      // 日本語は従来どおり「YYYY/MM/DD（木）」形式
      return `${year}/${mm}/${dd}${w ? `（${w}）` : ""}`;
    }

    // それ以外は "YYYY/MM/DD (Thu.)" のように括弧付きで表示
    if (w) {
      return `${year}/${mm}/${dd} (${w})`;
    }

    return `${year}/${mm}/${dd}`;
  }, [date, displayDate, facilityTranslations, currentLocale]);

  const topTexts = facilityTranslations?.top ?? {};
  const confirmTexts = facilityTranslations?.confirm ?? {};
  const bookingTexts = facilityTranslations?.booking ?? {};
  const labels = facilityTranslations?.labels ?? {};

  const resolveMessage = (key: string, fallback: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return fallback;
  };

  const facilityNameLabelBase: string =
    (topTexts.facilityName?.parking as string | undefined) ?? facilityName;
  const facilityNameLabel: string = resolveMessage(
    "top.facilityName.parking",
    facilityNameLabelBase,
  );

  const headingBase: string = (confirmTexts.heading as string | undefined) ?? "ご予約内容";
  const heading: string = resolveMessage("confirm.heading", headingBase);

  const dateLabelBase: string = (confirmTexts.dateLabel as string | undefined) ?? "予約日";
  const dateLabel: string = resolveMessage("confirm.dateLabel", dateLabelBase);

  const timeLabelBase: string = (confirmTexts.timeLabel as string | undefined) ?? "予約時間";
  const timeLabel: string = resolveMessage("confirm.timeLabel", timeLabelBase);

  const slotLabelTextBase: string =
    (bookingTexts.slotSectionTitle as string | undefined) ?? "区画";
  const slotLabelText: string = resolveMessage("booking.slotSectionTitle", slotLabelTextBase);

  const purposeLabelBase: string =
    (confirmTexts.purposeLabel as string | undefined) ?? "利用目的";
  const purposeLabel: string = resolveMessage("confirm.purposeLabel", purposeLabelBase);

  const vehicleNumberLabelBase: string =
    (labels.vehicle_number as string | undefined) ?? "車両ナンバー（任意）";
  const vehicleNumberLabel: string = resolveMessage(
    "labels.vehicle_number",
    vehicleNumberLabelBase,
  );

  const vehicleModelLabelBase: string =
    (labels.vehicle_model as string | undefined) ?? "車種・色（任意）";
  const vehicleModelLabel: string = resolveMessage(
    "labels.vehicle_model",
    vehicleModelLabelBase,
  );

  const executeNoticeBase: string =
    (confirmTexts.executeNotice as string | undefined) ??
    "上記の内容で予約します。よろしければ「予約」ボタンをタップしてください。";
  const executeNotice: string = resolveMessage("confirm.executeNotice", executeNoticeBase);

  const submitLabelBase: string = (confirmTexts.submitButton as string | undefined) ?? "予約";
  const submitLabel: string = resolveMessage("confirm.submitButton", submitLabelBase);

  const errorMessageTextBase: string =
    (confirmTexts.errorMessage as string | undefined) ??
    "エラーが発生しました。時間をおいて再度お試しください。";
  const errorMessageText: string = resolveMessage(
    "confirm.errorMessage",
    errorMessageTextBase,
  );

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
