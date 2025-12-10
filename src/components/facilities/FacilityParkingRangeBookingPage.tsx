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

  const [messages, setMessages] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [vehicleModel, setVehicleModel] = useState<string>("");

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

  useEffect(() => {
    let cancelled = false;

    const loadSlots = async () => {
      try {
        if (!rangeStart || !rangeEnd) {
          if (!cancelled) {
            setSlots([]);
            setSelectedSlotId(null);
          }
          return;
        }

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

  const resolveMessage = (key: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return "";
  };

  const parkingLayoutTitle: string = resolveMessage("booking.parkingLayoutTitle");
  const slotSectionTitle: string = resolveMessage("booking.slotSectionTitle");
  const reservationSectionTitle: string = resolveMessage("booking.reservationSectionTitle");
  const confirmButtonLabel: string = resolveMessage("booking.confirmButton");
  const reservationDateLabel: string = resolveMessage("labels.reservation_date");
  const vehicleNumberLabel: string = resolveMessage("labels.vehicle_number");
  const vehicleModelLabel: string = resolveMessage("labels.vehicle_model");

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
          {/* 車両情報フォームは現在 UI 上は非表示。将来再利用できるようコードは残しておく */}
          {false && (
            <VehicleInfoForm
              vehicleNumber={vehicleNumber}
              vehicleModel={vehicleModel}
              onChangeVehicleNumber={setVehicleNumber}
              onChangeVehicleModel={setVehicleModel}
              vehicleNumberLabel={vehicleNumberLabel}
              vehicleModelLabel={vehicleModelLabel}
            />
          )}
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
