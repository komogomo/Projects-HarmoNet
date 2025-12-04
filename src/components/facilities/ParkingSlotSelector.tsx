"use client";

import React, { useEffect } from "react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

type ParkingState = "available" | "booked" | "my";

export type ParkingSlot = {
  id: string;
  label: string;
  state: ParkingState;
};

interface ParkingSlotSelectorProps {
  slots: ParkingSlot[];
  selectedSlotId: string | null;
  onSelectSlot?: (slotId: string | null) => void;
  tenantId: string;
}

const ParkingSlotSelector: React.FC<ParkingSlotSelectorProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot,
  tenantId,
}) => {
  const { currentLocale } = useI18n();
  const [facilityTranslations, setFacilityTranslations] = React.useState<any | null>(null);
  const [messages, setMessages] = React.useState<Record<string, string>>({});

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

  const legendTexts = facilityTranslations?.booking?.legend ?? {};

  const resolveMessage = (key: string, fallback: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return fallback;
  };

  const legendAvailableBase: string = (legendTexts.available as string | undefined) ?? "空き";
  const legendAvailable: string = resolveMessage("booking.legend.available", legendAvailableBase);

  const legendSelectedBase: string = (legendTexts.selected as string | undefined) ?? "選択中";
  const legendSelected: string = resolveMessage("booking.legend.selected", legendSelectedBase);

  const legendBookedBase: string = (legendTexts.booked as string | undefined) ?? "予約済";
  const legendBooked: string = resolveMessage("booking.legend.booked", legendBookedBase);

  const legendMyBase: string = (legendTexts.my as string | undefined) ?? "自己予約済";
  const legendMy: string = resolveMessage("booking.legend.my", legendMyBase);

  const handleClick = (slot: ParkingSlot) => {
    if (slot.state === "booked") return;
    if (!onSelectSlot) return;
    const nextSelected = selectedSlotId === slot.id ? null : slot.id;
    onSelectSlot(nextSelected);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3 justify-items-center">
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;

          let classes =
            "flex h-16 w-24 flex-col items-center justify-center rounded-lg border-2 text-xs font-bold transition-colors";

          if (slot.state === "booked") {
            // 予約不可（カレンダー凡例と同じく濃いグレー）
            classes += " border-gray-400 bg-gray-200 text-gray-500 cursor-not-allowed";
          } else if (isSelected) {
            // 選択中（本日と同じトーン：青枠 + 青みの背景）
            classes += " border-blue-500 bg-blue-50 text-blue-700";
          } else if (slot.state === "my") {
            // 自予約済（枠は青、背景は薄いグレー）
            classes += " border-blue-500 bg-gray-200 text-blue-700";
          } else {
            // 空き（予約可能：薄い青枠）
            classes += " border-blue-200 bg-white text-gray-600";
          }

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => handleClick(slot)}
              disabled={slot.state === "booked"}
              className={classes}
            >
              <span className="text-lg">{slot.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-[11px] text-gray-600">
        <div className="inline-flex items-center gap-1">
          {/* 選択中 = 本日と同じイメージ（青枠 + 青み背景） */}
          <span className="inline-flex h-4 w-4 rounded-sm border-2 border-blue-500 bg-blue-50" />
          <span>{legendSelected}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          {/* 予約不可 = カレンダーと同じ濃いグレー */}
          <span className="inline-flex h-4 w-4 rounded-sm border-2 border-gray-400 bg-gray-300" />
          <span>{legendBooked}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          {/* 空き = 予約可能: 薄い青枠 */}
          <span className="inline-flex h-4 w-4 rounded-sm border-2 border-blue-200 bg-white" />
          <span>{legendAvailable}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          {/* 自己予約済 = 青枠 + グレー背景 */}
          <span className="inline-flex h-4 w-4 rounded-sm border-2 border-blue-500 bg-gray-300" />
          <span>{legendMy}</span>
        </div>
      </div>
    </div>
  );
};

export default ParkingSlotSelector;

