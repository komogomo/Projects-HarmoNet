"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
    minReservationMinutes?: number | null;
  }
>;

type UsageNotesMap = Record<string, { ja?: string; en?: string; zh?: string }>;

interface FacilityTopPageProps {
  tenantId: string;
  tenantName?: string;
  facilities: FacilitySummary[];
  settings: FacilitySettingsMap;
  usageNotes: UsageNotesMap;
  maxReservableDays: number;
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

type CalendarDaySummary = {
  date: string; // YYYY-MM-DD
  hasAvailability: boolean;
  hasMyReservation: boolean;
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
  tenantId,
  tenantName,
  facilities,
  settings,
  usageNotes,
  maxReservableDays,
}) => {
  const { currentLocale } = useI18n();
  const router = useRouter();

  const [facilityTranslations, setFacilityTranslations] = useState<any | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

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
        const response = await fetch(
          `/api/tenant-static-translations/facility?${params.toString()}`,
        );

        if (!response.ok) {
          if (!cancelled) {
            setMessages({});
          }
          return;
        }

        const data = (await response.json().catch(() => ({}))) as {
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

  // カレンダー日別サマリー（予約可能 / 予約不可 / 自予約済）
  const [daySummaries, setDaySummaries] = useState<Record<string, CalendarDaySummary>>({});
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  const tf = useCallback(
    (key: string) => {
      const fromDb = messages[key];
      if (typeof fromDb === "string" && fromDb.trim().length > 0) {
        return fromDb;
      }

      const fromJson = resolveFacilityKey(facilityTranslations, key);
      if (typeof fromJson === "string" && fromJson.trim().length > 0) {
        return fromJson;
      }

      return key;
    },
    [messages, facilityTranslations],
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

  // 駐車場用の開始日/終了日レンジ選択状態
  const [rangeStartDate, setRangeStartDate] = useState<Date | null>(null);
  const [rangeEndDate, setRangeEndDate] = useState<Date | null>(null);
  const [isCheckingRange, setIsCheckingRange] = useState(false);
  const [hasRangeAvailable, setHasRangeAvailable] = useState<boolean | null>(null);
  const [showRangeError, setShowRangeError] = useState(false);
  const [showRangeTooLongError, setShowRangeTooLongError] = useState(false);

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === selectedFacilityId) ?? null,
    [facilities, selectedFacilityId],
  );

  // 表示中の月が変わったとき、または施設が変わったときに日別サマリーを取得
  useEffect(() => {
    if (!selectedFacility) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        setIsLoadingCalendar(true);

        const monthStart = new Date(displayYear, displayMonthIndex, 1);
        const monthEnd = new Date(displayYear, displayMonthIndex + 1, 0);

        const startParam = formatDateParam(monthStart);
        const endParam = formatDateParam(monthEnd);

        const res = await fetch(
          `/api/facilities/${selectedFacility.id}/calendar?start=${encodeURIComponent(
            startParam,
          )}&end=${encodeURIComponent(endParam)}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          setDaySummaries({});
          return;
        }

        const data = (await res.json()) as
          | { ok: true; days: CalendarDaySummary[] }
          | { ok: false };

        if (!("ok" in data) || !data.ok || !Array.isArray((data as any).days)) {
          setDaySummaries({});
          return;
        }

        const map: Record<string, CalendarDaySummary> = {};
        for (const day of data.days) {
          if (day && typeof day.date === "string") {
            map[day.date] = day;
          }
        }

        setDaySummaries(map);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setDaySummaries({});
      } finally {
        setIsLoadingCalendar(false);
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [selectedFacility, displayYear, displayMonthIndex]);

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

  const processedUsageText = useMemo(() => {
    const base =
      typeof usageText === "string"
        ? usageText.replace(/^\s+/, "")
        : usageText;

    if (!selectedFacility) return base;

    if (selectedFacility.type === "parking") {
      const note = tf("top.parkingTermsNote");

      if (!base) {
        return note;
      }

      return `${base}\n\n${note}`;
    }

    return base;
  }, [usageText, selectedFacility, tf]);

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

  const formatDateParam = (date: Date): string => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = useCallback(
    (date: Date) => {
      if (!selectedFacility) return;

      const dateParam = formatDateParam(date);
      const path = `/facilities/${selectedFacility.id}/book?date=${dateParam}`;
      router.push(path);
    },
    [router, selectedFacility],
  );

  const handleParkingDateClick = useCallback(
    async (date: Date) => {
      if (!selectedFacility || selectedFacility.type !== "parking") return;

      // 過去日や予約可能期間外はここでは呼ばれない前提

      // 既にレンジが完了している場合、またはまだ何も選択されていない場合は開始日としてセット
      if (!rangeStartDate || (rangeStartDate && rangeEndDate)) {
        setRangeStartDate(date);
        setRangeEndDate(null);
        setHasRangeAvailable(null);
        setShowRangeError(false);
        setShowRangeTooLongError(false);
        return;
      }

      // rangeStartDate があり rangeEndDate がまだの場合
      const start = rangeStartDate;

      // 同じ日をタップした場合はトグル動作として選択解除（開始日もクリア）
      if (
        date.getFullYear() === start.getFullYear() &&
        date.getMonth() === start.getMonth() &&
        date.getDate() === start.getDate()
      ) {
        setRangeStartDate(null);
        setRangeEndDate(null);
        setHasRangeAvailable(null);
        setShowRangeError(false);
        setShowRangeTooLongError(false);
        return;
      }

      if (date < start) {
        // 逆順で選ばれた場合は開始日として扱う
        setRangeStartDate(date);
        setRangeEndDate(null);
        setHasRangeAvailable(null);
        setShowRangeError(false);
        setShowRangeTooLongError(false);
        return;
      }

      // レンジ長（開始日〜終了日、日数）は maxReservableDays 以内に制限
      const startOnlyDate = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
      );
      const endOnlyDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffMs = endOnlyDate.getTime() - startOnlyDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // 開始日・終了日を含む

      if (diffDays > Math.max(1, maxReservableDays)) {
        // 最大連続利用日数を超える場合はレンジを確定させずエラー表示のみ
        setRangeEndDate(null);
        setHasRangeAvailable(false);
        setShowRangeError(false);
        setShowRangeTooLongError(true);
        return;
      }

      setRangeEndDate(date);
      setIsCheckingRange(true);
      setHasRangeAvailable(null);
      setShowRangeError(false);
      setShowRangeTooLongError(false);

      try {
        const startParam = formatDateParam(start);
        const endParam = formatDateParam(date);
        const res = await fetch(
          `/api/facilities/${selectedFacility.id}/availability?start=${encodeURIComponent(
            startParam,
          )}&end=${encodeURIComponent(endParam)}`,
        );

        if (!res.ok) {
          setHasRangeAvailable(false);
          setShowRangeError(true);
          return;
        }

        const data = (await res.json()) as { ok?: boolean; hasAvailableSlot?: boolean };
        if (!data.ok) {
          setHasRangeAvailable(false);
          setShowRangeError(true);
          setShowRangeTooLongError(false);
          return;
        }

        const flag = !!data.hasAvailableSlot;
        setHasRangeAvailable(flag);
        if (!flag) {
          setShowRangeError(true);
          setShowRangeTooLongError(false);
        }
      } catch {
        setHasRangeAvailable(false);
        setShowRangeError(true);
        setShowRangeTooLongError(false);
      } finally {
        setIsCheckingRange(false);
      }
    },
    [rangeStartDate, rangeEndDate, selectedFacility],
  );

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
              <p className="text-sm text-gray-600">
                {tf("top.noFacilities")}
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
                  <p className="max-w-full truncate text-base text-gray-600">
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
                <label className="block text-[11px] text-gray-600 mb-1">
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
                {/* 利用説明＋翻訳ボタン */}
                <div className="mt-2 space-y-2">
                  <p className="whitespace-pre-wrap text-sm text-gray-600">
                    {processedUsageText}
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
                          {tf("top.translateButton")}
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
                <h2 className="text-sm text-gray-600">
                  {tf("top.calendarTitle")}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  {(() => {
                    const todayDate = new Date();
                    const isPrevDisabled =
                      displayYear === todayDate.getFullYear() &&
                      displayMonthIndex === todayDate.getMonth();

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (isPrevDisabled) return;
                            handlePrevMonth();
                          }}
                          disabled={isPrevDisabled}
                          className="inline-flex items-center justify-center rounded-md border-2 border-gray-200 bg-white p-1 text-[11px] text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={tf("top.prevMonth")}
                        >
                          <ChevronLeft
                            className="h-4 w-4 text-blue-600"
                            strokeWidth={2.6}
                            aria-hidden="true"
                          />
                        </button>
                        <span>
                          {formatMonthLabel(displayYear, displayMonthIndex, currentLocale)}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="inline-flex items-center justify-center rounded-md border-2 border-gray-200 bg-white p-1 text-[11px] text-gray-600 hover:bg-gray-50"
                          aria-label={tf("top.nextMonth")}
                        >
                          <ChevronRight
                            className="h-4 w-4 text-blue-600"
                            strokeWidth={2.6}
                            aria-hidden="true"
                          />
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="rounded-lg border-2 border-gray-200 bg-white p-3 text-xs text-gray-600">
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-600 mb-1">
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

                    const baseClasses =
                      "flex h-8 items-center justify-center rounded-md border-2 text-[12px]";

                    const dateKey = formatDateParam(cell.date as Date);
                    const summary = daySummaries[dateKey];
                    const isSunday = cell.weekday === 0;
                    const isSaturday = cell.weekday === 6;

                    let stateClasses: string;
                    if (cell.isPast) {
                      stateClasses = "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed";
                    } else if (summary?.hasMyReservation) {
                      // 自予約済（背景は予約不可と同じグレー、枠と文字を青に）
                      stateClasses =
                        "border-blue-500 bg-gray-200 text-blue-700 hover:bg-gray-100";
                    } else if (summary && !summary.hasAvailability) {
                      // 予約不可（曜日に関係なく優先）
                      stateClasses =
                        "border-gray-400 bg-gray-200 text-gray-500 cursor-not-allowed";
                    } else if (cell.isToday) {
                      // 本日（凡例通りのスタイル）
                      stateClasses =
                        "border-blue-500 bg-blue-50 text-blue-700 font-semibold";
                    } else if (isSunday) {
                      // 予約可能な日曜日
                      stateClasses =
                        "border-red-400 bg-white text-red-500 hover:bg-red-50";
                    } else if (isSaturday) {
                      // 予約可能な土曜日
                      stateClasses =
                        "border-yellow-400 bg-white text-yellow-600 hover:bg-yellow-50";
                    } else {
                      // 平日の予約可能日、またはサマリー未取得時
                      stateClasses =
                        "border-blue-200 bg-white text-gray-800 hover:bg-blue-50";
                    }

                    const isParking = selectedFacility?.type === "parking";

                    const isSelectedRangeDay = (() => {
                      if (!isParking || !rangeStartDate) return false;
                      const target = cell.date as Date;
                      const start = new Date(
                        rangeStartDate.getFullYear(),
                        rangeStartDate.getMonth(),
                        rangeStartDate.getDate(),
                      );
                      const end = rangeEndDate
                        ? new Date(
                            rangeEndDate.getFullYear(),
                            rangeEndDate.getMonth(),
                            rangeEndDate.getDate(),
                          )
                        : start;
                      return target >= start && target <= end;
                    })();

                    const selectionClasses = isSelectedRangeDay
                      ? " ring-2 ring-blue-400 ring-offset-1"
                      : "";

                    const isUnavailable =
                      !cell.isPast && summary !== undefined && !summary.hasAvailability;
                    const disabled = cell.isPast || isUnavailable;

                    const handleClick = () => {
                      if (!cell.date || disabled) return;
                      if (isParking) {
                        void handleParkingDateClick(cell.date as Date);
                      } else {
                        handleDateClick(cell.date as Date);
                      }
                    };

                    return (
                      <button
                        key={cell.date.toISOString()}
                        type="button"
                        disabled={disabled}
                        onClick={handleClick}
                        className={`${baseClasses} ${stateClasses}${selectionClasses}`}
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
                    <span className="inline-flex h-4 w-4 rounded-sm border-2 border-gray-400 bg-gray-300" />
                    <span>{tf("top.legend.unavailable")}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 rounded-sm border-2 border-blue-200 bg-white" />
                    <span>{tf("top.legend.available")}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 rounded-sm border-2 border-blue-500 bg-gray-300" />
                    <span>{tf("top.legend.mine")}</span>
                  </div>
                </div>
              </div>
              {/* 駐車場のみ：予約詳細ボタン */}
              {selectedFacility?.type === "parking" && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex-1 text-left">
                    {showRangeTooLongError && (
                      <p className="text-xs text-red-600">
                        {tf("top.parkingRangeTooLong")}
                      </p>
                    )}
                    {!showRangeTooLongError && showRangeError && (
                      <p className="text-xs text-red-600">
                        {tf("top.parkingRangeNotAvailable")}
                      </p>
                    )}
                  </div>
                  {/**
                   * 予約詳細ボタンの活性条件
                   * - 開始日が選択されていること
                   * - レンジチェック中でないこと
                   * - レンジ指定がある場合は hasRangeAvailable !== false
                   */}
                  {(() => {
                    const hasStart = !!rangeStartDate;
                    const hasEnd = !!rangeEndDate;
                    const rangeInvalid = hasEnd && hasRangeAvailable === false;
                    const disableButton =
                      !hasStart || isCheckingRange || rangeInvalid || showRangeTooLongError;

                    return (
                  <button
                    type="button"
                    disabled={disableButton}
                    onClick={() => {
                      if (!selectedFacility || !rangeStartDate) return;

                      // 単日フロー（開始日のみ選択）
                      if (!rangeEndDate) {
                        const dateParam = formatDateParam(rangeStartDate);
                        router.push(
                          `/facilities/${selectedFacility.id}/book?date=${encodeURIComponent(
                            dateParam,
                          )}`,
                        );
                        return;
                      }

                      // 連泊フロー（開始日+終了日）
                      if (!hasRangeAvailable) {
                        setShowRangeError(true);
                        setShowRangeTooLongError(false);
                        return;
                      }

                      const startParam = formatDateParam(rangeStartDate);
                      const endParam = formatDateParam(rangeEndDate);
                      router.push(
                        `/facilities/${selectedFacility.id}/book?start=${encodeURIComponent(
                          startParam,
                        )}&end=${encodeURIComponent(endParam)}`,
                      );
                    }}
                    className="inline-flex items-center whitespace-nowrap rounded-md border-2 border-blue-600 bg-white px-4 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-blue-200 disabled:text-blue-300"
                  >
                    {tf("top.viewReservationDetail")}
                  </button>
                    );
                  })()}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
      <HomeFooterShortcuts />
    </>
  );
};

export default FacilityTopPage;
