import { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";
import { resolveAvailabilityContext } from "../availability/route";

interface SlotsRouteContext {
  params?:
    | {
        facilityId?: string;
      }
    | Promise<{
        facilityId?: string;
      }>;
}

interface SlotResponseItem {
  id: string;
  label: string;
  state: "available" | "booked" | "my";
}

export async function GET(req: NextRequest, context: SlotsRouteContext) {
  try {
    const resolved = await resolveAvailabilityContext(req, context);
    if ("error" in resolved) {
      const { error } = resolved;
      return NextResponse.json(error.body, { status: error.status });
    }

    const { tenantId, userId, facilityId, facilityType } = resolved.context;

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");

    let rangeStart: Date | null = null;
    let rangeEndExclusive: Date | null = null;

    if (dateParam) {
      const base = new Date(`${dateParam}T00:00:00`);
      if (!Number.isNaN(base.getTime())) {
        rangeStart = base;
        rangeEndExclusive = new Date(base);
        rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);
      }
    } else if (startParam && endParam) {
      const startDate = new Date(`${startParam}T00:00:00`);
      const endDate = new Date(`${endParam}T00:00:00`);
      if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
        rangeStart = startDate;
        rangeEndExclusive = new Date(endDate);
        rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);
      }
    }

    if (!rangeStart || !rangeEndExclusive || rangeEndExclusive <= rangeStart) {
      return NextResponse.json(
        { ok: false as const, errorCode: "validation_error" as const },
        { status: 400 },
      );
    }

    const slots = await prisma.facility_slots.findMany({
      where: {
        tenant_id: tenantId,
        facility_id: facilityId,
        status: "active",
      },
      select: {
        id: true,
        slot_name: true,
      },
    });

    const activeSlotIds = slots
      .map((s) => s.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (!activeSlotIds.length) {
      return NextResponse.json({ ok: true as const, slots: [] as SlotResponseItem[] }, { status: 200 });
    }

    const reservations = await prisma.facility_reservations.findMany({
      where: {
        tenant_id: tenantId,
        facility_id: facilityId,
        slot_id: { in: activeSlotIds },
        status: { in: ["pending", "confirmed"] },
        start_at: {
          lt: rangeEndExclusive,
        },
        end_at: {
          gt: rangeStart,
        },
      },
      select: {
        slot_id: true,
        user_id: true,
      },
    });

    const items: SlotResponseItem[] = slots.map((slot) => {
      const slotId = slot.id as string;
      const slotReservations = reservations.filter((r) => r.slot_id === slotId);

      let state: SlotResponseItem["state"] = "available";

      if (slotReservations.some((r) => r.user_id === userId)) {
        state = "my";
      } else if (slotReservations.length > 0) {
        state = "booked";
      }

      return {
        id: slotId,
        label: (slot.slot_name as string) ?? "",
        state,
      };
    });

    logInfo("facility.slots.listed", {
      tenantId,
      facilityId,
      facilityType,
      date: dateParam,
      start: startParam,
      end: endParam,
      slots: items.length,
    });

    return NextResponse.json({ ok: true as const, slots: items }, { status: 200 });
  } catch (error) {
    logError("facility.slots.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false as const, errorCode: "server_error" as const },
      { status: 500 },
    );
  }
}
