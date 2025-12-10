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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  const resolveMessage = (key: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return "";
  };

  const facilityNameLabel: string = resolveMessage("top.facilityName.room");
  const heading: string = resolveMessage("confirm.heading");
  const dateLabel: string = resolveMessage("confirm.dateLabel");
  const timeLabel: string = resolveMessage("confirm.timeLabel");
  const participantsLabel: string = resolveMessage("confirm.participantsLabel");
  const purposeLabel: string = resolveMessage("confirm.purposeLabel");
  const executeNotice: string = resolveMessage("confirm.executeNotice");
  const submitLabel: string = resolveMessage("confirm.submitButton");
  const errorMessageText: string = resolveMessage("confirm.errorMessage");

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
