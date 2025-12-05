"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import ParkingSlotSelector, { type ParkingSlot } from "./ParkingSlotSelector";
import VehicleInfoForm from "./VehicleInfoForm";

export interface FacilityParkingRangeBookingPageProps {
  tenantId: string;
  facilityId: string;
  facilityName: string;
  rangeStart: string;
  rangeEnd: string;
  facilityDescription?: string | null;
  parkingImageUrl?: string | null;
}

const FacilityParkingRangeBookingPage: React.FC<FacilityParkingRangeBookingPageProps> = ({
  tenantId,
  facilityId,
  facilityName,
  rangeStart,
  rangeEnd,
  facilityDescription,
  parkingImageUrl,
}) => {
  const { currentLocale } = useI18n();
  const router = useRouter();

  const [facilityTranslations, setFacilityTranslations] = useState<any | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [vehicleModel, setVehicleModel] = useState<string>("");

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

  useEffect(() => {
    if (!rangeStart || !rangeEnd) {
      setSlots([]);
      setSelectedSlotId(null);
      return;
    }

    let cancelled = false;

    const loadSlots = async () => {
      try {
        const params = new URLSearchParams();
        params.set("start", rangeStart);
        params.set("end", rangeEnd);
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
  }, [facilityId, rangeStart, rangeEnd]);

  const bookingTexts = facilityTranslations?.booking ?? {};
  const labels = facilityTranslations?.labels ?? {};

  const resolveMessage = (key: string, fallback: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return fallback;
  };

  const parkingLayoutTitleBase: string =
    (bookingTexts.parkingLayoutTitle as string | undefined) ?? "駐車場配置図";
  const parkingLayoutTitle: string = resolveMessage(
    "booking.parkingLayoutTitle",
    parkingLayoutTitleBase,
  );

  const slotSectionTitleBase: string =
    (bookingTexts.slotSectionTitle as string | undefined) ?? "区画を選択";
  const slotSectionTitle: string = resolveMessage("booking.slotSectionTitle", slotSectionTitleBase);

  const reservationSectionTitleBase: string =
    (bookingTexts.reservationSectionTitle as string | undefined) ?? "予約詳細";
  const reservationSectionTitle: string = resolveMessage(
    "booking.reservationSectionTitle",
    reservationSectionTitleBase,
  );

  const confirmButtonLabelBase: string =
    (bookingTexts.confirmButton as string | undefined) ?? "確認画面";
  const confirmButtonLabel: string = resolveMessage(
    "booking.confirmButton",
    confirmButtonLabelBase,
  );

  const reservationDateLabelBase: string =
    (labels.reservation_date as string | undefined) ?? "予約日：";
  const reservationDateLabel: string = resolveMessage(
    "labels.reservation_date",
    reservationDateLabelBase,
  );

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

  const hasRange = !!rangeStart && !!rangeEnd;
  const canSubmit = hasRange && !!selectedSlotId;

  return (
    <section className="flex-1 space-y-4" aria-label="parking-booking-range">
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

      {/* 区画選択 */}
      <section className="space-y-2" aria-label="parking-slot-selector">
        <h2 className="text-sm font-semibold text-gray-800">{slotSectionTitle}</h2>
        <div className="rounded-lg border-2 border-gray-200 bg-white p-3">
          <ParkingSlotSelector
            tenantId={tenantId}
            slots={slots}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
          />
        </div>
      </section>

      {/* 予約詳細（連泊用） */}
      <section className="space-y-2" aria-label="reservation-detail-form-range">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-gray-800">{reservationSectionTitle}</h2>
          {hasRange && (
            <p className="text-sm font-semibold text-gray-800">
              {reservationDateLabel}
              {rangeStart} ~ {rangeEnd}
            </p>
          )}
        </div>
        <div className="rounded-lg border-2 border-gray-200 bg-white p-3">
          {/* 日付レンジモードなので時刻セレクトは表示しない */}
          <VehicleInfoForm
            vehicleNumber={vehicleNumber}
            vehicleModel={vehicleModel}
            onChangeVehicleNumber={setVehicleNumber}
            onChangeVehicleModel={setVehicleModel}
            vehicleNumberLabel={vehicleNumberLabel}
            vehicleModelLabel={vehicleModelLabel}
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                if (!canSubmit || !selectedSlotId) return;

                const params = new URLSearchParams();
                params.set("start", rangeStart);
                params.set("end", rangeEnd);
                params.set("slotId", selectedSlotId);

                if (vehicleNumber.trim().length > 0) {
                  params.set("vehicleNumber", vehicleNumber.trim());
                }

                if (vehicleModel.trim().length > 0) {
                  params.set("vehicleModel", vehicleModel.trim());
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
    </section>
  );
};

export default FacilityParkingRangeBookingPage;
