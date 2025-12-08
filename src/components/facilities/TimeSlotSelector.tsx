"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

type SlotState = "available" | "selected" | "booked" | "blocked";

type Slot = {
  time: string;
  state: SlotState;
};

interface TimeSlotSelectorProps {
  availableFromTime?: string | null;
  availableToTime?: string | null;
  onRangeChange?: (startTime: string | null, endTime: string | null) => void;
  tenantId: string;
}

const parseHmToMinutes = (value: string | null | undefined, fallback: number): number => {
  if (!value) return fallback;
  const match = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(value);
  if (!match) return fallback;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  return hours * 60 + minutes;
};

const buildTimeList = (fromTime?: string | null, toTime?: string | null): string[] => {
  const defaultFrom = 9 * 60; // 09:00
  const defaultTo = 19 * 60; // 19:00

  const fromMinutes = parseHmToMinutes(fromTime ?? null, defaultFrom);
  const toMinutes = parseHmToMinutes(toTime ?? null, defaultTo);

  const safeFrom = Number.isFinite(fromMinutes) ? fromMinutes : defaultFrom;
  const safeTo = Number.isFinite(toMinutes) ? toMinutes : defaultTo;

  if (safeTo <= safeFrom) {
    return [];
  }

  const result: string[] = [];
  for (let minutes = safeFrom; minutes <= safeTo; minutes += 30) {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, "0");
    const m = (minutes % 60).toString().padStart(2, "0");
    result.push(`${h}:${m}`);
  }

  return result;
};

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  availableFromTime,
  availableToTime,
  onRangeChange,
  tenantId,
}) => {
  const { currentLocale } = useI18n();
  const [rangeStartIndex, setRangeStartIndex] = useState<number | null>(null);
  const [rangeEndIndex, setRangeEndIndex] = useState<number | null>(null);
  const [facilityTranslations, setFacilityTranslations] = useState<any | null>(null);
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

  const slots: Slot[] = useMemo(() => {
    const baseTimes = buildTimeList(availableFromTime ?? undefined, availableToTime ?? undefined);

    return baseTimes.map((time, index) => {
      const state: SlotState = "available";
      return { time, state };
    });
  }, [availableFromTime, availableToTime]);

  const legendTexts = facilityTranslations?.booking?.legend ?? {};

  const resolveMessage = (key: string, fallback: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return fallback;
  };

  const legendSelectedBase: string = (legendTexts.selected as string | undefined) ?? "選択中";
  const legendSelected: string = resolveMessage("booking.legend.selected", legendSelectedBase);

  const legendBookedBase: string = (legendTexts.booked as string | undefined) ?? "予約済";
  const legendBooked: string = resolveMessage("booking.legend.booked", legendBookedBase);

  const legendAvailableBase: string = (legendTexts.available as string | undefined) ?? "予約可能";
  const legendAvailable: string = resolveMessage("booking.legend.available", legendAvailableBase);

  const legendMyBase: string = (legendTexts.my as string | undefined) ?? "自予約済";
  const legendMy: string = resolveMessage("booking.legend.my", legendMyBase);

  const handleToggle = (slot: Slot, index: number) => {
    if (slot.state === "booked" || slot.state === "blocked") {
      return;
    }

    // まだ開始が無い、または既に開始・終了がそろっている場合は新しい開始として扱う
    if (rangeStartIndex === null || (rangeStartIndex !== null && rangeEndIndex !== null)) {
      setRangeStartIndex(index);
      setRangeEndIndex(null);
      if (onRangeChange) {
        onRangeChange(slot.time, null);
      }
      return;
    }

    // rangeStartIndex があり rangeEndIndex がまだの場合
    if (rangeStartIndex !== null && rangeEndIndex === null) {
      // 同じスロットをもう一度タップした場合はトグルとして選択解除
      if (index === rangeStartIndex) {
        setRangeStartIndex(null);
        setRangeEndIndex(null);
        if (onRangeChange) {
          onRangeChange(null, null);
        }
        return;
      }

      // 範囲選択中に、開始より前をタップした場合は開始を更新
      if (index < rangeStartIndex) {
        setRangeStartIndex(index);
        setRangeEndIndex(null);
        if (onRangeChange) {
          onRangeChange(slot.time, null);
        }
        return;
      }

      // 開始より後ろをタップしたら終了として確定
      const startTime = slots[rangeStartIndex].time;
      const endTime = slot.time;
      setRangeEndIndex(index);
      if (onRangeChange) {
        onRangeChange(startTime, endTime);
      }
      return;
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-1 text-[11px]">
        {slots.map((slot, index) => {
          const isInSelectedRange = (() => {
            if (rangeStartIndex === null) return false;
            if (rangeEndIndex === null) return index === rangeStartIndex;
            return index >= rangeStartIndex && index <= rangeEndIndex;
          })();

          const state: SlotState = slot.state;

          let classes =
            "flex items-center justify-center rounded-md border-2 px-1.5 py-1.5 text-[11px]";
          if (state === "available") {
            // カレンダーの「予約可能」と同じ青系アウトライン
            classes += " border-blue-200 bg-white text-gray-600 hover:bg-blue-50";
          } else if (state === "booked") {
            classes += " border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed";
          } else if (state === "blocked") {
            // 予約不可（カレンダー凡例と合わせてグレー系に統一）
            classes += " border-gray-400 bg-gray-300 text-gray-500 cursor-not-allowed";
          }

          // 範囲選択中のセルにはカレンダーと同じリングを付与
          if (isInSelectedRange && state === "available") {
            classes += " ring-2 ring-blue-400 ring-offset-1";
          }

          return (
            <button
              key={slot.time}
              type="button"
              onClick={() => handleToggle(slot, index)}
              disabled={slot.state === "booked" || slot.state === "blocked"}
              className={classes}
            >
              {slot.time}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600">
        <div className="inline-flex items-center gap-1">
          <span className="inline-flex h-3.5 w-3.5 rounded-sm border-2 border-blue-500 bg-blue-50" />
          <span>{legendSelected}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="inline-flex h-3.5 w-3.5 rounded-sm border-2 border-gray-200 bg-gray-100" />
          <span>{legendBooked}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="inline-flex h-3.5 w-3.5 rounded-sm border-2 border-blue-200 bg-white" />
          <span>{legendAvailable}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="inline-flex h-3.5 w-3.5 rounded-sm border-2 border-blue-500 bg-gray-300" />
          <span>{legendMy}</span>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotSelector;

