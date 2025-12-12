"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { useTenantStaticTranslations } from "@/src/components/common/StaticI18nProvider";
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
  tenantId,
  facilityId,
  facilityName,
  selectedDate,
  facilityDescription,
  availableFromTime,
  availableToTime,
  maxParticipants,
}) => {
  const { t } = useI18n();
  useTenantStaticTranslations({ tenantId, apiPath: "facility" });
  const router = useRouter();
  const [rangeStartTime, setRangeStartTime] = useState<string | null>(null);
  const [rangeEndTime, setRangeEndTime] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string>("");
  const [participantCount, setParticipantCount] = useState<string>("");
  const [existingReservationId, setExistingReservationId] = useState<string | null>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false);

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

  const reservationDateLabel: string = t("labels.reservation_date");
  const purposeLabel: string = t("labels.purpose");
  const participantCountLabel: string = t("labels.participant_count");
  const facilityNameLabel: string = t("top.facilityName.room");
  const reservationSectionTitle: string = t("booking.reservationSectionTitle");
  const confirmButtonLabel: string = t("booking.confirmButton");
  const cancelButtonLabel: string = t("booking.cancelButton");
  const cancelConfirmMessage: string = t("booking.cancelConfirmMessage");
  const cancelConfirmNoLabel: string = t("booking.cancelConfirmNo");
  const cancelConfirmYesLabel: string = t("booking.cancelConfirmYes");

  const reservationTimeLabel: string = t("confirm.timeLabel");
  const selectPlaceholderLabel: string = t("booking.selectTimePlaceholder");

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
            <p className="text-sm text-gray-600">{facilityNameLabel}</p>
          </div>
        )}
        <div className="rounded-lg border-2 border-gray-200 bg-white p-3">
          <TimeSlotSelector
            tenantId={tenantId}
            availableFromTime={availableFromTime}
            availableToTime={availableToTime}
            myReservedStartTime={existingReservationId ? rangeStartTime : null}
            myReservedEndTime={existingReservationId ? rangeEndTime : null}
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
          <h2 className="text-sm text-gray-600">{reservationSectionTitle}</h2>
          {selectedDate && (
            <p className="text-sm text-gray-600">
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
            reservationTimeLabel={reservationTimeLabel}
            selectPlaceholderLabel={selectPlaceholderLabel}
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
              className="text-red-500 hover:text-red-600 disabled:opacity-50"
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
