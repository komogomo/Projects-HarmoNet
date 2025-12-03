import { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";
import { resolveAvailabilityContext } from "../availability/route";

interface CalendarRouteContext {
  params?:
    | {
        facilityId?: string;
      }
    | Promise<{
        facilityId?: string;
      }>;
}

type CalendarDaySummary = {
  date: string; // YYYY-MM-DD
  hasAvailability: boolean;
  hasMyReservation: boolean;
};

const MS_PER_MINUTE = 60 * 1000;

function parseHmToMinutes(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(value);
  if (!match) return fallback;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  return hours * 60 + minutes;
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * MS_PER_MINUTE);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildBusySlots(
  dayStart: Date,
  fromMinutes: number,
  toMinutes: number,
  slotDurationMinutes: number,
  intervals: { start: Date; end: Date }[],
): { maxFreeSlots: number; slotsPerDay: number } {
  const safeDuration = Number.isFinite(slotDurationMinutes) && slotDurationMinutes > 0
    ? slotDurationMinutes
    : 30;

  const windowStart = addMinutes(dayStart, fromMinutes);
  const windowEnd = addMinutes(dayStart, toMinutes);

  if (windowEnd <= windowStart) {
    return { maxFreeSlots: 0, slotsPerDay: 0 };
  }

  const totalMinutes = (windowEnd.getTime() - windowStart.getTime()) / MS_PER_MINUTE;
  const slotsPerDay = Math.max(1, Math.floor(totalMinutes / safeDuration));
  const busy: boolean[] = new Array(slotsPerDay).fill(false);

  for (const interval of intervals) {
    const rawStart = Math.max(interval.start.getTime(), windowStart.getTime());
    const rawEnd = Math.min(interval.end.getTime(), windowEnd.getTime());
    if (rawEnd <= rawStart) continue;

    const offsetStartMinutes = (rawStart - windowStart.getTime()) / MS_PER_MINUTE;
    const offsetEndMinutes = (rawEnd - windowStart.getTime()) / MS_PER_MINUTE;

    let startIndex = Math.floor(offsetStartMinutes / safeDuration);
    let endIndex = Math.ceil(offsetEndMinutes / safeDuration);

    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(slotsPerDay, endIndex);

    for (let i = startIndex; i < endIndex; i += 1) {
      busy[i] = true;
    }
  }

  let maxFree = 0;
  let currentFree = 0;
  for (let i = 0; i < slotsPerDay; i += 1) {
    if (!busy[i]) {
      currentFree += 1;
      if (currentFree > maxFree) {
        maxFree = currentFree;
      }
    } else {
      currentFree = 0;
    }
  }

  return { maxFreeSlots: maxFree, slotsPerDay };
}

export async function GET(req: NextRequest, context: CalendarRouteContext) {
  try {
    const resolved = await resolveAvailabilityContext(req, context);
    if ("error" in resolved) {
      const { error } = resolved;
      return NextResponse.json(error.body, { status: error.status });
    }

    const { tenantId, userId, facilityId, facilityType } = resolved.context;

    const url = new URL(req.url);
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end") ?? startParam;

    if (!startParam || !endParam) {
      return NextResponse.json(
        { ok: false, errorCode: "validation_error" as const },
        { status: 400 },
      );
    }

    const startDate = new Date(`${startParam}T00:00:00`);
    const endDate = new Date(`${endParam}T00:00:00`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { ok: false, errorCode: "validation_error" as const },
        { status: 400 },
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { ok: false, errorCode: "validation_error" as const },
        { status: 400 },
      );
    }

    // 安全のため、最大 62 日程度に制限
    const maxDays = 62;
    const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (diffDays > maxDays) {
      return NextResponse.json(
        { ok: false, errorCode: "range_too_long" as const },
        { status: 400 },
      );
    }

    const rangeStart = startDate;
    const rangeEndExclusive = new Date(endDate);
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

    const settings = await prisma.facility_settings.findFirst({
      where: {
        tenant_id: tenantId,
        facility_id: facilityId,
      },
      select: {
        slot_duration_minutes: true,
        available_from_time: true,
        available_to_time: true,
        min_reservation_minutes: true,
      },
    });

    const slotDurationMinutes = settings?.slot_duration_minutes ?? 30;
    const availableFromMinutes = parseHmToMinutes(settings?.available_from_time ?? "09:00", 9 * 60);
    const availableToMinutes = parseHmToMinutes(settings?.available_to_time ?? "19:00", 19 * 60);
    const minReservationMinutesRaw = settings?.min_reservation_minutes ?? 120;

    const minReservationMinutes = Number.isFinite(minReservationMinutesRaw) && minReservationMinutesRaw > 0
      ? minReservationMinutesRaw
      : 120;

    // 予約とブロック範囲をまとめて取得
    const [reservations, blocks, slots] = await Promise.all([
      prisma.facility_reservations.findMany({
        where: {
          tenant_id: tenantId,
          facility_id: facilityId,
          status: { in: ["pending", "confirmed"] },
          start_at: {
            lt: rangeEndExclusive,
          },
          end_at: {
            gt: rangeStart,
          },
        },
        select: {
          user_id: true,
          slot_id: true,
          start_at: true,
          end_at: true,
        },
      }),
      prisma.facility_blocked_ranges.findMany({
        where: {
          tenant_id: tenantId,
          facility_id: facilityId,
          start_at: {
            lt: rangeEndExclusive,
          },
          end_at: {
            gt: rangeStart,
          },
        },
        select: {
          start_at: true,
          end_at: true,
        },
      }),
      prisma.facility_slots.findMany({
        where: {
          tenant_id: tenantId,
          facility_id: facilityId,
          status: "active",
        },
        select: {
          id: true,
        },
      }),
    ]);

    const activeSlotIds = slots
      .map((s) => s.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const hasSlots = activeSlotIds.length > 0;

    const days: CalendarDaySummary[] = [];

    const dayCursor = new Date(startDate);
    while (dayCursor <= endDate) {
      const dayStart = new Date(dayCursor.getFullYear(), dayCursor.getMonth(), dayCursor.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dateKey = formatDate(dayStart);

      const dayReservations = reservations.filter(
        (r) => r.start_at < dayEnd && r.end_at > dayStart,
      );

      const dayBlocks = blocks.filter((b) => b.start_at < dayEnd && b.end_at > dayStart);

      const hasMyReservation = dayReservations.some((r) => r.user_id === userId);

      let hasAvailability = false;

      const thresholdSlots = Math.max(
        1,
        Math.ceil(minReservationMinutes / (slotDurationMinutes > 0 ? slotDurationMinutes : 30)),
      );

      const mergedBlocks = dayBlocks.map((b) => ({ start: b.start_at, end: b.end_at }));

      if (facilityType === "parking" && hasSlots) {
        for (const slotId of activeSlotIds) {
          const slotReservations = dayReservations.filter((r) => r.slot_id === slotId);
          const intervals = [
            ...slotReservations.map((r) => ({ start: r.start_at, end: r.end_at })),
            ...mergedBlocks,
          ];

          const { maxFreeSlots, slotsPerDay } = buildBusySlots(
            dayStart,
            availableFromMinutes,
            availableToMinutes,
            slotDurationMinutes,
            intervals,
          );

          if (slotsPerDay > 0 && maxFreeSlots >= thresholdSlots) {
            hasAvailability = true;
            break;
          }
        }
      } else {
        // 集会室など（単一リソース扱い）
        const intervals = [
          ...dayReservations.map((r) => ({ start: r.start_at, end: r.end_at })),
          ...mergedBlocks,
        ];

        const { maxFreeSlots, slotsPerDay } = buildBusySlots(
          dayStart,
          availableFromMinutes,
          availableToMinutes,
          slotDurationMinutes,
          intervals,
        );

        if (slotsPerDay > 0 && maxFreeSlots >= thresholdSlots) {
          hasAvailability = true;
        }
      }

      days.push({
        date: dateKey,
        hasAvailability,
        hasMyReservation,
      });

      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    logInfo("facility.calendar.days_computed", {
      tenantId,
      facilityId,
      facilityType,
      start: startParam,
      end: endParam,
      days: days.length,
    });

    return NextResponse.json({ ok: true, days }, { status: 200 });
  } catch (error) {
    logError("facility.calendar.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, errorCode: "server_error" as const },
      { status: 500 },
    );
  }
}
