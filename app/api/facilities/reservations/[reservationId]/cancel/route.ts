import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db/prisma";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { resolveReservationAuthContext } from "../../route";

interface CancelRouteContext {
  params?:
    | {
        reservationId?: string;
      }
    | Promise<{
        reservationId?: string;
      }>;
}

export async function POST(req: NextRequest, context: CancelRouteContext) {
  try {
    const auth = await resolveReservationAuthContext();
    if ("error" in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, userId } = auth.context;

    const rawParams = await context.params;
    const reservationId = rawParams?.reservationId;

    if (!reservationId || typeof reservationId !== "string" || reservationId.length === 0) {
      return NextResponse.json(
        { ok: false as const, errorCode: "validation_error" as const },
        { status: 400 },
      );
    }

    const reservation = await prisma.facility_reservations.findFirst({
      where: {
        id: reservationId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        tenant_id: true,
        facility_id: true,
        slot_id: true,
        user_id: true,
        start_at: true,
        end_at: true,
        status: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { ok: false as const, errorCode: "reservation_not_found" as const },
        { status: 404 },
      );
    }

    // 本人以外のキャンセルは現時点では不可（将来、管理者キャンセルを追加する余地を残す）
    if (reservation.user_id !== userId) {
      return NextResponse.json(
        { ok: false as const, errorCode: "forbidden" as const },
        { status: 403 },
      );
    }

    if (reservation.status === "canceled") {
      return NextResponse.json(
        { ok: false as const, errorCode: "already_canceled" as const },
        { status: 409 },
      );
    }

    if (reservation.status !== "pending" && reservation.status !== "confirmed") {
      return NextResponse.json(
        { ok: false as const, errorCode: "cannot_cancel" as const },
        { status: 400 },
      );
    }

    const now = new Date();
    if (now >= reservation.start_at) {
      return NextResponse.json(
        { ok: false as const, errorCode: "too_late_to_cancel" as const },
        { status: 400 },
      );
    }

    const updated = await prisma.facility_reservations.update({
      where: {
        id: reservation.id,
      },
      data: {
        status: "canceled",
      },
      select: {
        id: true,
        facility_id: true,
        slot_id: true,
        status: true,
      },
    });

    try {
      await prisma.reservation_history.create({
        data: {
          tenant_id: tenantId,
          reservation_id: reservation.id,
          facility_id: reservation.facility_id,
          slot_id: reservation.slot_id,
          user_id: reservation.user_id,
          actor_user_id: userId,
          event_type: "user_canceled",
          from_status: reservation.status,
          to_status: "canceled",
          occurred_at: new Date(),
          note: null,
        },
      });
    } catch (historyError) {
      logError("facility.reservations.history.cancel_error", {
        tenantId,
        userId,
        facilityId: reservation.facility_id,
        reservationId: reservation.id,
        errorMessage:
          historyError instanceof Error ? historyError.message : String(historyError),
      });
    }

    logInfo("facility.reservations.api.canceled", {
      tenantId,
      userId,
      reservationId: reservation.id,
    });

    return NextResponse.json(
      {
        ok: true as const,
        reservationId: updated.id,
      },
      { status: 200 },
    );
  } catch (error) {
    logError("facility.reservations.api.cancel_unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { ok: false as const, errorCode: "server_error" as const },
      { status: 500 },
    );
  }
}
