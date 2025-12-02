"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Languages, CalendarDays, ChevronDown } from "lucide-react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";

type FacilitySummary = {
  id: string;
  name: string;
  type: string;
};

type FacilitySettingsMap = Record<
  string,
  {
    availableFromTime?: string | null;
    availableToTime?: string | null;
    feePerDay?: number | null;
    feeUnit?: string | null;
    maxConsecutiveDays?: number | null;
    reservableUntilMonths?: number | null;
  }
>;

type UsageNotesMap = Record<string, { ja?: string; en?: string; zh?: string }>;

interface FacilityTopPageProps {
  tenantId: string;
  tenantName?: string;
  facilities: FacilitySummary[];
  settings: FacilitySettingsMap;
  usageNotes: UsageNotesMap;
}

const resolveFacilityKey = (obj: any, key: string): string | undefined => {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = key.split(".");
  let current: any = obj;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }

  return typeof current === "string" ? current : undefined;
};

type CalendarCell = {
  date: Date | null;
  isToday: boolean;
  isPast: boolean;
  weekday: number;
};

const getDaysInMonth = (year: number, monthIndex: number): CalendarCell[] => {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const cells: CalendarCell[] = [];
  const today = new Date();

  const startWeekday = firstDay.getDay(); // 0: Sun ... 6: Sat

  // Leading empty cells so that the 1st aligns with the correct weekday column
  for (let w = 0; w < startWeekday; w += 1) {
    cells.push({ date: null, isToday: false, isPast: false, weekday: w });
  }

  for (let d = 1; d <= lastDay.getDate(); d += 1) {
    const current = new Date(year, monthIndex, d);
    const weekday = current.getDay();
    const isToday =
      current.getFullYear() === today.getFullYear() &&
      current.getMonth() === today.getMonth() &&
      current.getDate() === today.getDate();
    const isPast = current < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    cells.push({ date: current, isToday, isPast, weekday });
  }

  return cells;
};

const formatMonthLabel = (year: number, monthIndex: number, locale: "ja" | "en" | "zh") => {
  const date = new Date(year, monthIndex, 1);
  const tag = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "ja-JP";
  return date.toLocaleDateString(tag, { year: "numeric", month: "long" });
};

const FacilityTopPage: React.FC<FacilityTopPageProps> = ({
  tenantId: _tenantId,
  tenantName,
  facilities,
  settings,
  usageNotes,
}) => {
  const { t, currentLocale } = useI18n();

  const [facilityTranslations, setFacilityTranslations] = useState<any | null>(null);

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

  const tf = useCallback(
    (key: string) => {
      if (!facilityTranslations) return key;
      const value = resolveFacilityKey(facilityTranslations, key);
      return typeof value === "string" ? value : key;
    },
    [facilityTranslations],
  );

  const getFacilityDisplayName = useCallback(
    (facility: FacilitySummary): string => {
      if (facility.type === "room") {
        return tf("top.facilityName.room");
      }
      if (facility.type === "parking") {
        return tf("top.facilityName.parking");
      }
      return facility.name;
    },
    [tf],
  );

  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    facilities[0]?.id ?? null,
  );

  const today = new Date();
  const [displayYear, setDisplayYear] = useState<number>(today.getFullYear());
  const [displayMonthIndex, setDisplayMonthIndex] = useState<number>(today.getMonth());

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === selectedFacilityId) ?? null,
    [facilities, selectedFacilityId],
  );

  const selectedSettings = selectedFacility
    ? settings[selectedFacility.id] ?? {}
    : {};

  const selectedUsageNotes = selectedFacility
    ? usageNotes[selectedFacility.id] ?? {}
    : {};

  const usageText = useMemo(() => {
    if (!selectedFacility) return "";

    if (currentLocale === "en") {
      return selectedUsageNotes.en || selectedUsageNotes.ja || "";
    }

    if (currentLocale === "zh") {
      return selectedUsageNotes.zh || selectedUsageNotes.ja || "";
    }

    return selectedUsageNotes.ja || "";
  }, [selectedFacility, selectedUsageNotes, currentLocale]);

  const hasTranslation = useMemo(() => {
    if (!selectedFacility) return false;
    if (currentLocale === "en") {
      return !!selectedUsageNotes.en;
    }
    if (currentLocale === "zh") {
      return !!selectedUsageNotes.zh;
    }
    return false;
  }, [selectedFacility, selectedUsageNotes, currentLocale]);

  const showTranslateButton = currentLocale !== "ja";

  const daysInMonth = useMemo(
    () => getDaysInMonth(displayYear, displayMonthIndex),
    [displayYear, displayMonthIndex],
  );

  const handlePrevMonth = () => {
    const next = new Date(displayYear, displayMonthIndex - 1, 1);
    setDisplayYear(next.getFullYear());
    setDisplayMonthIndex(next.getMonth());
  };

  const handleNextMonth = () => {
    const next = new Date(displayYear, displayMonthIndex + 1, 1);
    setDisplayYear(next.getFullYear());
    setDisplayMonthIndex(next.getMonth());
  };

  if (!selectedFacility && facilities.length === 0) {
    return (
      <>
        <main className="min-h-screen bg-white">
          <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
            <section className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-500">
                {t("board.detail.section.content")}
              </p>
            </section>
          </div>
        </main>
        <HomeFooterShortcuts />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
          <section
            aria-labelledby="facility-top-title"
            data-testid="facility-top-page"
            className="flex-1 space-y-6"
          >
            {/* テナント名 */}
            {tenantName && (
              <header>
                <div className="mb-1 flex justify-center">
                  <p className="max-w-full truncate text-base font-medium text-gray-600">
                    {tenantName}
                  </p>
                </div>
              </header>
            )}

            {/* 施設選択 */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h1
                  id="facility-top-title"
                  className="sr-only"
                >
                  施設予約
                </h1>
              </div>

              <div className="rounded-lg border-2 border-gray-200 bg-white p-3">
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  {tf("top.selectFacility")}
                </label>
                <div className="relative">
                  <select
                    value={selectedFacilityId ?? ""}
                    onChange={(event) => setSelectedFacilityId(event.target.value)}
                    className="w-full appearance-none rounded-md border-2 border-gray-300 bg-white px-3 py-2 pr-9 text-xs text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  >
                    {facilities.map((facility) => (
                      <option
                        key={facility.id}
                        value={facility.id}
                      >
                        {getFacilityDisplayName(facility)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600"
                    strokeWidth={2.6}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </section>

            {/* 施設情報カード */}
            {selectedFacility && (
              <section
                aria-label="facility-info"
                className="rounded-lg border-2 border-gray-200 bg-white p-4 space-y-3"
              >
                {/* 利用時間などの概要 */}
                <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
                  {selectedSettings?.availableFromTime && selectedSettings?.availableToTime && (
                    <div className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                      <CalendarDays className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {tf("top.usageTimeLabel")}: {selectedSettings.availableFromTime}〜
                        {selectedSettings.availableToTime}
                      </span>
                    </div>
                  )}
                </div>

                {/* 利用説明＋翻訳ボタン */}
                <div className="mt-2 space-y-2">
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {usageText}
                  </p>

                  {showTranslateButton && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={hasTranslation}
                        className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[11px] disabled:opacity-60 ${hasTranslation
                          ? "border-gray-200 bg-gray-100 text-gray-400"
                          : "border-blue-200 text-blue-600 hover:bg-blue-50"}
                        `}
                      >
                        <Languages className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {hasTranslation
                            ? t("board.detail.i18n.translate")
                            : t("board.detail.i18n.translate")}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* カレンダー */}
            <section
              aria-label="facility-calendar"
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  {tf("top.calendarTitle")}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="rounded-md border-2 border-gray-200 bg-white px-2 py-0.5 text-[11px] hover:bg-gray-50"
                  >
                    {tf("top.prevMonth")}
                  </button>
                  <span className="font-medium">
                    {formatMonthLabel(displayYear, displayMonthIndex, currentLocale)}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="rounded-md border-2 border-gray-200 bg-white px-2 py-0.5 text-[11px] hover:bg-gray-50"
                  >
                    {tf("top.nextMonth")}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border-2 border-gray-200 bg-white p-3 text-xs text-gray-700">
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500 mb-1">
                  <span>{tf("top.weekdays.sun")}</span>
                  <span>{tf("top.weekdays.mon")}</span>
                  <span>{tf("top.weekdays.tue")}</span>
                  <span>{tf("top.weekdays.wed")}</span>
                  <span>{tf("top.weekdays.thu")}</span>
                  <span>{tf("top.weekdays.fri")}</span>
                  <span>{tf("top.weekdays.sat")}</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {daysInMonth.map((cell, index) => {
                    if (!cell.date) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="h-8"
                        />
                      );
                    }

                    const day = cell.date.getDate();
                    const isSunday = cell.weekday === 0;
                    const isSaturday = cell.weekday === 6;

                    const baseClasses =
                      "flex h-8 items-center justify-center rounded-md border-2 text-[12px]";

                    let stateClasses: string;
                    if (cell.isPast) {
                      stateClasses = "border-gray-200 bg-gray-50 text-gray-400";
                    } else if (cell.isToday) {
                      stateClasses = "border-blue-500 bg-blue-50 text-blue-700 font-semibold";
                    } else if (isSunday) {
                      stateClasses =
                        "border-red-400 bg-white text-red-500 hover:bg-red-50";
                    } else if (isSaturday) {
                      stateClasses =
                        "border-yellow-400 bg-white text-yellow-600 hover:bg-yellow-50";
                    } else {
                      stateClasses =
                        "border-blue-200 bg-white text-gray-800 hover:bg-blue-50";
                    }

                    return (
                      <button
                        key={cell.date.toISOString()}
                        type="button"
                        disabled={cell.isPast}
                        className={`${baseClasses} ${stateClasses}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* カレンダー凡例 */}
                <div className="mt-3 flex flex-wrap justify-center gap-4 text-[12px] text-gray-600">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 rounded-sm border-2 border-blue-500 bg-blue-50" />
                    <span>{tf("top.legend.today")}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 rounded-sm border-2 border-blue-200 bg-white" />
                    <span>{tf("top.legend.available")}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 rounded-sm border-2 border-yellow-400 bg-white" />
                    <span className="text-yellow-700">{tf("top.legend.saturday")}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 rounded-sm border-2 border-red-400 bg-white" />
                    <span className="text-red-600">{tf("top.legend.sunday")}</span>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </div>
      </main>
      <HomeFooterShortcuts />
    </>
  );
};

export default FacilityTopPage;
