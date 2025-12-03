import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db/prisma";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { resolveReservationAuthContext } from "../../facilities/reservations/route";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveReservationAuthContext();
    if ("error" in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, userId } = auth.context;

    const url = new URL(req.url);
    const facilityId = url.searchParams.get("facilityId");
    const dateParam = url.searchParams.get("date");

    if (!facilityId || !dateParam) {
      return NextResponse.json(
        { ok: false as const, errorCode: "validation_error" as const },
        { status: 400 },
      );
    }

    const dayStart = new Date(`${dateParam}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
      return NextResponse.json(
        { ok: false as const, errorCode: "validation_error" as const },
        { status: 400 },
      );
    }

    const reservation = await prisma.facility_reservations.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        facility_id: facilityId,
        status: { in: ["pending", "confirmed"] },
        start_at: {
          lt: dayEnd,
        },
        end_at: {
          gt: dayStart,
        },
      },
      select: {
        id: true,
        facility_id: true,
        slot_id: true,
        start_at: true,
        end_at: true,
        status: true,
        purpose: true,
        participant_count: true,
        meta: true,
      },
    });

    if (!reservation) {
      return NextResponse.json({ ok: true as const, reservation: null }, { status: 200 });
    }

    const formatHm = (date: Date): string => {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const startTime = formatHm(reservation.start_at);
    const endTime = formatHm(reservation.end_at);

    const meta = (reservation.meta ?? null) as any | null;

    const vehicleNumber =
      meta && typeof meta.vehicleNumber === "string" ? (meta.vehicleNumber as string) : null;
    const vehicleModel =
      meta && typeof meta.vehicleModel === "string" ? (meta.vehicleModel as string) : null;

    const responseReservation = {
      id: reservation.id,
      facilityId: reservation.facility_id,
      slotId: reservation.slot_id,
      date: dateParam,
      startTime,
      endTime,
      status: reservation.status,
      purpose: reservation.purpose,
      participantCount: reservation.participant_count,
      vehicleNumber,
      vehicleModel,
    };

    logInfo("reservations.me.found", {
      tenantId,
      userId,
      facilityId,
      date: dateParam,
      reservationId: reservation.id,
    });

    return NextResponse.json(
      { ok: true as const, reservation: responseReservation },
      { status: 200 },
    );
  } catch (error) {
    logError("reservations.me.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false as const, errorCode: "server_error" as const },
      { status: 500 },
    );
  }
}

