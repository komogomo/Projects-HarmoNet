"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import TimeSlotSelector from "./TimeSlotSelector";
import ReservationForm from "./ReservationForm";

export interface FacilityMeetingRoomBookingPageProps {
  tenantId: string;
  facilityId: string;
  facilityName: string;
  selectedDate: string;
  facilityDescription?: string | null;
  availableFromTime?: string | null;
  availableToTime?: string | null;
  maxParticipants?: number | null;
}

const FacilityMeetingRoomBookingPage: React.FC<FacilityMeetingRoomBookingPageProps> = ({
  facilityId,
  facilityName,
  selectedDate,
  facilityDescription,
  availableFromTime,
  availableToTime,
  maxParticipants,
}) => {
  const { currentLocale } = useI18n();
  const router = useRouter();

  const [facilityTranslations, setFacilityTranslations] = useState<any | null>(null);
  const [rangeStartTime, setRangeStartTime] = useState<string | null>(null);
  const [rangeEndTime, setRangeEndTime] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string>("");
  const [participantCount, setParticipantCount] = useState<string>("");
  const [existingReservationId, setExistingReservationId] = useState<string | null>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false);

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

    load();

    return () => {
      cancelled = true;
    };
  }, [currentLocale]);

  useEffect(() => {
    if (!selectedDate) {
      setExistingReservationId(null);
      return;
    }

    let cancelled = false;

    const loadExistingReservation = async () => {
      try {
        const params = new URLSearchParams();
        params.set("facilityId", facilityId);
        params.set("date", selectedDate);
        const res = await fetch(`/api/reservations/me?${params.toString()}`);
        if (!res.ok) {
          if (!cancelled) {
            setExistingReservationId(null);
          }
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const reservation = data?.reservation;
        if (!reservation) {
          setExistingReservationId(null);
          return;
        }

        setExistingReservationId(
          typeof reservation.id === "string" && reservation.id.length > 0
            ? (reservation.id as string)
            : null,
        );

        if (typeof reservation.startTime === "string") {
          setRangeStartTime(reservation.startTime as string);
        }
        if (typeof reservation.endTime === "string") {
          setRangeEndTime(reservation.endTime as string);
        }

        if (typeof reservation.purpose === "string") {
          setPurpose(reservation.purpose as string);
        }
        if (reservation.participantCount != null) {
          setParticipantCount(String(reservation.participantCount));
        }
      } catch {
        if (!cancelled) {
          setExistingReservationId(null);
        }
      }
    };

    void loadExistingReservation();

    return () => {
      cancelled = true;
    };
  }, [facilityId, selectedDate]);

  const labels = facilityTranslations?.labels ?? {};
  const reservationDateLabel: string =
    (labels.reservation_date as string | undefined) ?? "予約日：";
  const purposeLabel: string = (labels.purpose as string | undefined) ?? "利用目的";
  const participantCountLabel: string =
    (labels.participant_count as string | undefined) ?? "参加人数";

  const topTexts = facilityTranslations?.top ?? {};
  const facilityNameLabel: string =
    (topTexts.facilityName?.room as string | undefined) ?? facilityName;

  const bookingTexts = facilityTranslations?.booking ?? {};
  const reservationSectionTitle: string =
    (bookingTexts.reservationSectionTitle as string | undefined) ?? "予約詳細";
  const confirmButtonLabel: string =
    (bookingTexts.confirmButton as string | undefined) ?? "確認画面";
  const cancelButtonLabel: string =
    (bookingTexts.cancelButton as string | undefined) ?? "キャンセル";
  const cancelConfirmMessage: string =
    (bookingTexts.cancelConfirmMessage as string | undefined) ?? "この予約をキャンセルしますか？";
  const cancelConfirmNoLabel: string =
    (bookingTexts.cancelConfirmNo as string | undefined) ?? "いいえ";
  const cancelConfirmYesLabel: string =
    (bookingTexts.cancelConfirmYes as string | undefined) ?? "はい";

  const handleRequestCancel = () => {
    if (!existingReservationId || isSubmittingCancel) return;
    setIsCancelConfirmOpen(true);
  };

  const handleCancelDialogClose = () => {
    if (isSubmittingCancel) return;
    setIsCancelConfirmOpen(false);
  };

  const handleConfirmCancel = async () => {
    if (!existingReservationId || isSubmittingCancel) return;

    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/facilities/reservations/${existingReservationId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        return;
      }

      router.push("/facilities");
    } finally {
      setIsCancelConfirmOpen(false);
      setIsSubmittingCancel(false);
    }
  };

  return (
    <section className="flex-1 space-y-4" aria-label="meeting-room-booking">
      {/* ヘッダー（集会室の説明は施設トップ画面で表示するため、予約画面では非表示） */}
      <header className="space-y-2" />

      {/* 時間枠（空き状況） */}
      <section className="space-y-2" aria-label="time-slot-selector">
        {facilityNameLabel && (
          <div className="flex justify-center">
            <p className="text-sm font-semibold text-gray-800">{facilityNameLabel}</p>
          </div>
        )}
        <div className="rounded-lg border-2 border-gray-200 bg-white p-3">
          <TimeSlotSelector
            availableFromTime={availableFromTime}
            availableToTime={availableToTime}
            onRangeChange={(start, end) => {
              setRangeStartTime(start);
              setRangeEndTime(end);
            }}
          />
        </div>
      </section>

      {/* 予約詳細フォーム */}
      <section className="space-y-2" aria-label="reservation-detail-form">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-gray-800">{reservationSectionTitle}</h2>
          {selectedDate && (
            <p className="text-sm font-semibold text-gray-800">
              {reservationDateLabel}
              {selectedDate}
            </p>
          )}
        </div>
        <div className="rounded-lg border-2 border-gray-200 bg-white p-3">
          <ReservationForm
            maxParticipants={maxParticipants}
            selectedStartTime={rangeStartTime}
            selectedEndTime={rangeEndTime}
            purposeLabel={purposeLabel}
            participantCountLabel={participantCountLabel}
            purpose={purpose}
            participantCount={participantCount}
            onChangePurpose={setPurpose}
            onChangeParticipantCount={setParticipantCount}
          />
          <div className="mt-4 flex justify-center gap-3">
            {existingReservationId && (
              <button
                type="button"
                onClick={handleRequestCancel}
                disabled={isSubmittingCancel}
                className="inline-flex items-center rounded-md border-2 border-blue-600 bg-white px-4 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-blue-200 disabled:text-blue-300"
              >
                {cancelButtonLabel}
              </button>
            )}
            <button
              type="button"
              disabled={!selectedDate || !rangeStartTime || !rangeEndTime || !!existingReservationId}
              onClick={() => {
                if (!selectedDate || !rangeStartTime || !rangeEndTime) return;

                const params = new URLSearchParams();
                params.set("date", selectedDate);
                params.set("start", rangeStartTime);
                params.set("end", rangeEndTime);
                if (purpose) {
                  params.set("purpose", purpose);
                }
                if (participantCount) {
                  params.set("participants", participantCount);
                }

                router.push(`/facilities/${facilityId}/confirm?${params.toString()}`);
              }}
              className="inline-flex items-center rounded-md border-2 border-blue-600 bg-white px-4 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-blue-200 disabled:text-blue-300"
            >
              {confirmButtonLabel}
            </button>
          </div>
        </div>
      </section>

    {isCancelConfirmOpen && (
      <div
        className="fixed inset-0 z-[1050] flex items-center justify-center bg-transparent"
        onClick={handleCancelDialogClose}
      >
        <div
          className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="mb-3 whitespace-pre-line">{cancelConfirmMessage}</p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancelDialogClose}
              disabled={isSubmittingCancel}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              {cancelConfirmNoLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isSubmittingCancel}
              className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {cancelConfirmYesLabel}
            </button>
          </div>
        </div>
      </div>
    )}
  </section>
  );
};

export default FacilityMeetingRoomBookingPage;
