"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

interface FacilityMeetingRoomConfirmProps {
  tenantId: string;
  facilityId: string;
  facilityName: string;
  date: string; // YYYY-MM-DD
  displayDate: string;
  startTime: string;
  endTime: string;
  participants?: string;
  purpose?: string;
}

const FacilityMeetingRoomConfirm: React.FC<FacilityMeetingRoomConfirmProps> = ({
  tenantId,
  facilityId,
  facilityName,
  date,
  displayDate,
  startTime,
  endTime,
  participants,
  purpose,
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
        if (!cancelled) {
          setFacilityTranslations(null);
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

  const resolveMessage = (key: string, fallback: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return fallback;
  };

  const facilityNameLabelBase: string =
    (topTexts.facilityName?.room as string | undefined) ?? facilityName;
  const facilityNameLabel: string = resolveMessage(
    "top.facilityName.room",
    facilityNameLabelBase,
  );

  const headingBase: string = (confirmTexts.heading as string | undefined) ?? "ご予約内容";
  const heading: string = resolveMessage("confirm.heading", headingBase);

  const dateLabelBase: string = (confirmTexts.dateLabel as string | undefined) ?? "予約日";
  const dateLabel: string = resolveMessage("confirm.dateLabel", dateLabelBase);

  const timeLabelBase: string = (confirmTexts.timeLabel as string | undefined) ?? "予約時間";
  const timeLabel: string = resolveMessage("confirm.timeLabel", timeLabelBase);

  const participantsLabelBase: string =
    (confirmTexts.participantsLabel as string | undefined) ?? "参加人数";
  const participantsLabel: string = resolveMessage(
    "confirm.participantsLabel",
    participantsLabelBase,
  );

  const purposeLabelBase: string =
    (confirmTexts.purposeLabel as string | undefined) ?? "利用目的";
  const purposeLabel: string = resolveMessage("confirm.purposeLabel", purposeLabelBase);

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
      const participantsNumber =
        typeof participants === "string" && participants.trim().length > 0
          ? Number.parseInt(participants, 10)
          : undefined;

      const payload: any = {
        facilityId,
        date,
        startTime,
        endTime,
      };

      if (purpose && purpose.trim().length > 0) {
        payload.purpose = purpose;
      }

      if (
        typeof participantsNumber === "number" &&
        Number.isFinite(participantsNumber) &&
        participantsNumber > 0
      ) {
        payload.participants = participantsNumber;
      }

      const res = await fetch("/api/facilities/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // エラーコードは現状画面には出さず、共通メッセージのみ表示
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
    <section className="flex-1 space-y-6" aria-label="facility-confirm-meeting-room">
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
            {participants && (
              <p>
                {participantsLabel}：{participants}
              </p>
            )}
            {purpose && <p>{purposeLabel}：</p>}
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

        {submitError && (
          <p className="text-xs text-red-600">{submitError}</p>
        )}

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

export default FacilityMeetingRoomConfirm;
