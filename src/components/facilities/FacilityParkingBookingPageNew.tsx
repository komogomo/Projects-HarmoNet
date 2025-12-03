"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import ParkingSlotSelector, { type ParkingSlot } from "./ParkingSlotSelector";
import VehicleInfoForm from "./VehicleInfoForm";

export interface FacilityParkingBookingPageProps {
  tenantId: string;
  facilityId: string;
  facilityName: string;
  selectedDate: string;
  facilityDescription?: string | null;
  availableFromTime?: string | null;
  availableToTime?: string | null;
  parkingImageUrl?: string | null;
}

const FacilityParkingBookingPage: React.FC<FacilityParkingBookingPageProps> = ({
  facilityId,
  facilityName,
  selectedDate,
  facilityDescription,
  availableFromTime,
  availableToTime,
  parkingImageUrl,
}) => {
  const { currentLocale } = useI18n();
  const router = useRouter();

  const [facilityTranslations, setFacilityTranslations] = useState<any | null>(null);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [isAllDay, setIsAllDay] = useState<boolean>(false);
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [vehicleModel, setVehicleModel] = useState<string>("");
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
      setSlots([]);
      setSelectedSlotId(null);
      return;
    }

    let cancelled = false;

    const loadSlots = async () => {
      try {
        const params = new URLSearchParams();
        params.set("date", selectedDate);
        const res = await fetch(`/api/facilities/${facilityId}/slots?${params.toString()}`);
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        const items = Array.isArray(data.slots) ? data.slots : [];
        const mapped: ParkingSlot[] = items.map((slot: any) => {
          const rawState = slot.state === "my" || slot.state === "booked" ? slot.state : "available";
          return {
            id: String(slot.id),
            label:
              typeof slot.label === "string" && slot.label.length > 0
                ? slot.label
                : String(slot.id),
            state: rawState,
          };
        });

        setSlots(mapped);
        setSelectedSlotId((prev) => (prev && mapped.some((s) => s.id === prev) ? prev : null));
      } catch {
        if (!cancelled) {
          setSlots([]);
          setSelectedSlotId(null);
        }
      }
    };

    void loadSlots();

    return () => {
      cancelled = true;
    };
  }, [facilityId, selectedDate]);

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

        if (typeof reservation.slotId === "string" && reservation.slotId.length > 0) {
          setSelectedSlotId(reservation.slotId as string);
        }

        if (typeof reservation.startTime === "string") {
          setStartTime(reservation.startTime as string);
        }
        if (typeof reservation.endTime === "string") {
          setEndTime(reservation.endTime as string);
        }

        if (typeof reservation.vehicleNumber === "string") {
          setVehicleNumber(reservation.vehicleNumber as string);
        }
        if (typeof reservation.vehicleModel === "string") {
          setVehicleModel(reservation.vehicleModel as string);
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

  useEffect(() => {
    if (!isAllDay) return;

    if (availableFromTime && availableToTime) {
      setStartTime(availableFromTime);
      setEndTime(availableToTime);
    }
  }, [isAllDay, availableFromTime, availableToTime]);

  const bookingTexts = facilityTranslations?.booking ?? {};
  const labels = facilityTranslations?.labels ?? {};
  const topTexts = facilityTranslations?.top ?? {};

  const parkingLayoutTitle: string =
    (bookingTexts.parkingLayoutTitle as string | undefined) ?? "駐車場配置図";
  const slotSectionTitle: string =
    (bookingTexts.slotSectionTitle as string | undefined) ?? "区画を選択";
  const timeSlotSectionTitle: string =
    (bookingTexts.timeSlotSectionTitle as string | undefined) ?? "空き状況";
  const reservationSectionTitle: string =
    (bookingTexts.reservationSectionTitle as string | undefined) ?? "予約詳細";
  const startTimeLabel: string = (bookingTexts.startTime as string | undefined) ?? "開始時刻";
  const endTimeLabel: string = (bookingTexts.endTime as string | undefined) ?? "終了時刻";
  const allDayLabel: string = (bookingTexts.allDay as string | undefined) ?? "終日";
  const timeSelectPlaceholder: string =
    (bookingTexts.selectTimePlaceholder as string | undefined) ?? "選択してください";
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
  const reservationDateLabel: string =
    (labels.reservation_date as string | undefined) ?? "予約日：";
  const facilityNameLabel: string =
    (topTexts.facilityName?.parking as string | undefined) ?? facilityName;

  const timeOptions: string[] = useMemo(() => {
    const results: string[] = [];

    const parseTime = (value: string | null | undefined): number | null => {
      if (!value || !/^([0-1]\d|2[0-3]):([0-5]\d)$/.test(value)) return null;
      const [h, m] = value.split(":").map((v) => Number(v));
      if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
      return h * 60 + m;
    };

    const formatTime = (totalMinutes: number): string => {
      const h = Math.floor(totalMinutes / 60)
        .toString()
        .padStart(2, "0");
      const m = (totalMinutes % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    };

    const defaultStart = 0; // 00:00
    const defaultEnd = 23 * 60 + 30; // 23:30

    const from = parseTime(availableFromTime) ?? defaultStart;
    const to = parseTime(availableToTime) ?? defaultEnd;

    for (let t = from; t <= to; t += 30) {
      results.push(formatTime(t));
    }

    return results;
  }, [availableFromTime, availableToTime]);

  const canSubmit =
    !!selectedDate &&
    !!selectedSlotId &&
    !!startTime &&
    !!endTime &&
    startTime < endTime;

  const handleSubmit = () => {
    if (!canSubmit) return;

    const params = new URLSearchParams();
    params.set("date", selectedDate);
    params.set("start", startTime);
    params.set("end", endTime);
    params.set("slotId", selectedSlotId as string);
    if (vehicleNumber.trim().length > 0) {
      params.set("vehicleNumber", vehicleNumber.trim());
    }
    if (vehicleModel.trim().length > 0) {
      params.set("vehicleModel", vehicleModel.trim());
    }

    router.push(`/facilities/${facilityId}/confirm?${params.toString()}`);
  };

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
    <section className="flex-1 space-y-4" aria-label="parking-booking-single">
      {/* ヘッダー（説明文がある場合のみ） */}
      {facilityDescription && (
        <header className="space-y-2">
          <div className="mt-2 rounded-lg border-2 border-gray-200 bg-white p-3 text-xs text-gray-700">
            <p className="whitespace-pre-wrap leading-relaxed">{facilityDescription}</p>
          </div>
        </header>
      )}

      {/* 駐車場配置図（DBの image_url/meta から渡された場合のみ表示） */}
      {parkingImageUrl && (
        <section className="space-y-2" aria-label="parking-layout">
          <h2 className="text-sm font-semibold text-gray-800">{parkingLayoutTitle}</h2>
          <div className="overflow-hidden rounded-lg border-2 border-gray-200 bg-white">
            <div className="relative w-full" style={{ paddingBottom: "150%" }}>
              <img
                src={parkingImageUrl}
                alt={parkingLayoutTitle}
                className="absolute inset-0 h-full w-full object-contain bg-white"
              />
            </div>
          </div>
        </section>
      )}

      {/* 区画セレクター */}
      <section className="space-y-2" aria-label="parking-slot-selector">
        <h2 className="text-sm font-semibold text-gray-800">{slotSectionTitle}</h2>
        <div className="rounded-lg border-2 border-gray-200 bg-white p-3">
          <ParkingSlotSelector
            slots={slots}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
          />
        </div>
      </section>

      {/* 時間帯選択＋予約詳細 */}
      <section className="space-y-2" aria-label="reservation-detail-form-single">
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
          {/* 時刻セレクト */}
          <div className="mb-4 space-y-2" aria-label={timeSlotSectionTitle}>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">{startTimeLabel}</label>
                <select
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  disabled={isAllDay}
                >
                  <option value="">{timeSelectPlaceholder}</option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">{endTimeLabel}</label>
                <select
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  disabled={isAllDay}
                >
                  <option value="">{timeSelectPlaceholder}</option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-gray-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={isAllDay}
                  onChange={(event) => setIsAllDay(event.target.checked)}
                />
                <span>{allDayLabel}</span>
              </label>
            </div>
          </div>

          {/* 車両情報 */}
          <VehicleInfoForm
            vehicleNumber={vehicleNumber}
            vehicleModel={vehicleModel}
            onChangeVehicleNumber={setVehicleNumber}
            onChangeVehicleModel={setVehicleModel}
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
              disabled={!canSubmit || !!existingReservationId}
              onClick={handleSubmit}
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

export default FacilityParkingBookingPage;
