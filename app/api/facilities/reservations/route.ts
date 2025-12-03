import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";

interface ReservationRequestBody {
  facilityId?: string;
  slotId?: string; // 駐車場などスロットを持つ施設用
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  purpose?: string;
  participants?: number;
  vehicleNumber?: string;
  vehicleModel?: string;
}

type AuthContextResult =
  | {
      error: {
        status: number;
        body: { errorCode: string };
      };
    }
  | {
      context: {
        tenantId: string;
        userId: string;
      };
    };

export async function resolveReservationAuthContext(): Promise<AuthContextResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError("facility.reservations.api.auth_error", {
      reason: authError?.message ?? "no_session",
    });
    return { error: { status: 401, body: { errorCode: "auth_error" } } };
  }

  const email = user.email;

  const {
    data: appUser,
    error: appUserError,
  } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (appUserError || !appUser) {
    logError("facility.reservations.api.user_not_found", {
      email,
    });
    return { error: { status: 403, body: { errorCode: "unauthorized" } } };
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (membershipError || !membership?.tenant_id) {
    logError("facility.reservations.api.membership_error", {
      userId: appUser.id,
    });
    return { error: { status: 403, body: { errorCode: "unauthorized" } } };
  }

  return {
    context: {
      tenantId: membership.tenant_id as string,
      userId: appUser.id as string,
    },
  };
}

function parseDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;

  // Expecting "YYYY-MM-DD" and "HH:MM"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^([0-1]\d|2[0-3]):([0-5]\d)$/.test(time)) return null;

  const value = new Date(`${date}T${time}:00`);
  if (Number.isNaN(value.getTime())) {
    return null;
  }
  return value;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveReservationAuthContext();
    if ("error" in auth) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }

    const { tenantId, userId } = auth.context;

    let body: ReservationRequestBody;
    try {
      body = (await req.json()) as ReservationRequestBody;
    } catch {
      body = {};
    }

    const facilityId =
      typeof body.facilityId === "string" && body.facilityId.length > 0
        ? body.facilityId
        : null;
    const slotId =
      typeof body.slotId === "string" && body.slotId.length > 0 ? body.slotId : null;
    const date = typeof body.date === "string" ? body.date : null;
    const startTime = typeof body.startTime === "string" ? body.startTime : null;
    const endTime = typeof body.endTime === "string" ? body.endTime : null;

    if (!facilityId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { ok: false as const, errorCode: "validation_error" as const },
        { status: 400 },
      );
    }

    const startAt = parseDateTime(date, startTime);
    const endAt = parseDateTime(date, endTime);

    if (!startAt || !endAt || endAt <= startAt) {
      return NextResponse.json(
        { ok: false as const, errorCode: "validation_error" as const },
        { status: 400 },
      );
    }

    const facility = await prisma.facilities.findFirst({
      where: {
        id: facilityId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        facility_type: true,
      },
    });

    if (!facility) {
      return NextResponse.json(
        { ok: false as const, errorCode: "facility_not_found" as const },
        { status: 404 },
      );
    }

    const facilityType = (facility.facility_type as string) ?? "";

    const whereBase: any = {
      tenant_id: tenantId,
      facility_id: facilityId,
      status: { in: ["pending", "confirmed"] },
      start_at: {
        lt: endAt,
      },
      end_at: {
        gt: startAt,
      },
    };

    // 駐車場はスロット単位でダブルブッキングを禁止
    if (facilityType === "parking") {
      if (!slotId) {
        return NextResponse.json(
          { ok: false as const, errorCode: "validation_error" as const },
          { status: 400 },
        );
      }
      whereBase.slot_id = slotId;
    }

    const existing = await prisma.facility_reservations.findFirst({
      where: whereBase,
      select: {
        id: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false as const, errorCode: "reservation_conflict" as const },
        { status: 409 },
      );
    }

    const participantCount =
      typeof body.participants === "number" && Number.isFinite(body.participants)
        ? body.participants
        : null;

    const meta: Prisma.JsonObject = {};

    if (typeof body.vehicleNumber === "string" && body.vehicleNumber.trim().length > 0) {
      meta.vehicleNumber = body.vehicleNumber.trim();
    }

    if (typeof body.vehicleModel === "string" && body.vehicleModel.trim().length > 0) {
      meta.vehicleModel = body.vehicleModel.trim();
    }

    const metaValue: Prisma.JsonObject | undefined =
      Object.keys(meta).length > 0 ? meta : undefined;

    const reservation = await prisma.facility_reservations.create({
      data: {
        tenant_id: tenantId,
        facility_id: facilityId,
        user_id: userId,
        slot_id: slotId ?? null,
        start_at: startAt,
        end_at: endAt,
        purpose: typeof body.purpose === "string" ? body.purpose : null,
        participant_count: participantCount,
        meta: metaValue,
        status: "pending",
      },
      select: {
        id: true,
      },
    });

    try {
      await prisma.reservation_history.create({
        data: {
          tenant_id: tenantId,
          reservation_id: reservation.id,
          facility_id: facilityId,
          slot_id: slotId ?? null,
          user_id: userId,
          actor_user_id: userId,
          event_type: "created",
          from_status: null,
          to_status: "pending",
          occurred_at: new Date(),
          note: null,
        },
      });
    } catch (historyError) {
      logError("facility.reservations.history.create_error", {
        tenantId,
        userId,
        facilityId,
        reservationId: reservation.id,
        errorMessage:
          historyError instanceof Error
            ? historyError.message
            : String(historyError),
      });
    }

    logInfo("facility.reservations.api.created", {
      tenantId,
      userId,
      facilityId,
      reservationId: reservation.id,
      date,
      startTime,
      endTime,
    });

    return NextResponse.json(
      {
        ok: true as const,
        reservationId: reservation.id,
      },
      { status: 201 },
    );
  } catch (error) {
    logError("facility.reservations.api.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false as const, errorCode: "server_error" as const },
      { status: 500 },
    );
  }
}

