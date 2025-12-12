"use client";

import React, { useMemo, useState } from "react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { useTenantStaticTranslations } from "@/src/components/common/StaticI18nProvider";

type SlotState = "available" | "selected" | "booked" | "blocked" | "my";

type Slot = {
  time: string;
  state: SlotState;
};

interface TimeSlotSelectorProps {
  availableFromTime?: string | null;
  availableToTime?: string | null;
  onRangeChange?: (startTime: string | null, endTime: string | null) => void;
  tenantId: string;
  myReservedStartTime?: string | null;
  myReservedEndTime?: string | null;
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
  myReservedStartTime,
  myReservedEndTime,
}) => {
  const { t } = useI18n();
  useTenantStaticTranslations({ tenantId, apiPath: "facility" });
  const [rangeStartIndex, setRangeStartIndex] = useState<number | null>(null);
  const [rangeEndIndex, setRangeEndIndex] = useState<number | null>(null);

  const slots: Slot[] = useMemo(() => {
    const baseTimes = buildTimeList(availableFromTime ?? undefined, availableToTime ?? undefined);

    return baseTimes.map((time, index) => {
      const state: SlotState = "available";
      return { time, state };
    });
  }, [availableFromTime, availableToTime]);

  const myReservedRange = useMemo(() => {
    const start = typeof myReservedStartTime === "string" ? myReservedStartTime : "";
    const end = typeof myReservedEndTime === "string" ? myReservedEndTime : "";
    if (!start || !end) return null;

    const startMin = parseHmToMinutes(start, -1);
    const endMin = parseHmToMinutes(end, -1);
    if (startMin < 0 || endMin < 0) return null;
    if (endMin < startMin) return null;

    return { startMin, endMin };
  }, [myReservedStartTime, myReservedEndTime]);

  const legendSelected: string = t("booking.legend.selected");
  const legendBooked: string = t("booking.legend.booked");
  const legendAvailable: string = t("booking.legend.available");
  const legendMy: string = t("booking.legend.my");

  const handleToggle = (slot: Slot, index: number) => {
    if (slot.state === "booked" || slot.state === "blocked" || slot.state === "my") {
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

          const state: SlotState = (() => {
            if (!myReservedRange) return slot.state;
            const slotMin = parseHmToMinutes(slot.time, -1);
            if (slotMin < 0) return slot.state;
            if (slotMin >= myReservedRange.startMin && slotMin <= myReservedRange.endMin) {
              return "my";
            }
            return slot.state;
          })();

          let classes =
            "flex items-center justify-center rounded-md border-2 px-1.5 py-1.5 text-[11px]";
          if (state === "available") {
            // カレンダーの「予約可能」と同じ青系アウトライン
            classes += " border-blue-200 bg-white text-gray-600 hover:bg-blue-50";
          } else if (state === "my") {
            // 自予約済（枠は青、背景は薄いグレー）
            classes += " border-blue-500 bg-gray-200 text-blue-700 cursor-not-allowed";
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
              onClick={() => handleToggle({ ...slot, state }, index)}
              disabled={state === "booked" || state === "blocked" || state === "my"}
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

