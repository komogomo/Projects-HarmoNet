import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";

interface AvailabilityRouteContext {
  params?:
    | {
        facilityId?: string;
      }
    | Promise<{
        facilityId?: string;
      }>;
}

type AvailabilityContextResult =
  | {
      error: {
        status: number;
        body: { ok: false; errorCode: string };
      };
    }
  | {
      context: {
        tenantId: string;
        userId: string;
        facilityId: string;
        facilityType: string;
      };
    };

export async function resolveAvailabilityContext(
  req: NextRequest,
  context: AvailabilityRouteContext,
): Promise<AvailabilityContextResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError("facility.availability.auth_error", {
      reason: authError?.message ?? "no_session",
      path: req.url,
    });
    return {
      error: {
        status: 401,
        body: { ok: false, errorCode: "auth_error" },
      },
    };
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
    logError("facility.availability.user_not_found");
    return {
      error: {
        status: 403,
        body: { ok: false, errorCode: "unauthorized" },
      },
    };
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
    logError("facility.availability.membership_error", {
      userId: appUser.id,
    });
    return {
      error: {
        status: 403 as const,
        body: { ok: false as const, errorCode: "unauthorized" as const },
      },
    } as const;
  }

  let facilityId: string | undefined;

  if (context.params) {
    const params = await context.params;
    facilityId = params?.facilityId;
  }

  if (!facilityId) {
    try {
      const url = new URL(req.url);
      const segments = url.pathname.split("/").filter(Boolean);
      const facilitiesIndex = segments.indexOf("facilities");
      if (facilitiesIndex >= 0 && segments.length > facilitiesIndex + 1) {
        facilityId = segments[facilitiesIndex + 1];
      }
    } catch {
      // noop; handled below
    }
  }

  if (!facilityId) {
    return {
      error: {
        status: 400,
        body: { ok: false, errorCode: "validation_error" },
      },
    };
  }

  const tenantId = membership.tenant_id as string;

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
    logError("facility.availability.facility_not_found", {
      tenantId,
      facilityId,
    });
    return {
      error: {
        status: 404 as const,
        body: { ok: false as const, errorCode: "facility_not_found" as const },
      },
    } as const;
  }

  return {
    context: {
      tenantId,
      userId: appUser.id as string,
      facilityId,
      facilityType: facility.facility_type as string,
    },
  };
}

export async function GET(req: NextRequest, context: AvailabilityRouteContext) {
  try {
    const resolved = await resolveAvailabilityContext(req, context);
    if ("error" in resolved) {
      const { error } = resolved;
      return NextResponse.json(error.body, { status: error.status });
    }

    const { tenantId, facilityId } = resolved.context;

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

    const rangeStart = startDate;
    const rangeEndExclusive = new Date(endDate);
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

    const slots = await prisma.facility_slots.findMany({
      where: {
        tenant_id: tenantId,
        facility_id: facilityId,
        status: "active",
      },
      select: {
        id: true,
      },
    });

    if (!slots.length) {
      logInfo("facility.availability.no_slots", {
        tenantId,
        facilityId,
      });
      return NextResponse.json({ ok: true, hasAvailableSlot: false }, { status: 200 });
    }

    const slotIds = slots
      .map((slot) => slot.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (!slotIds.length) {
      return NextResponse.json({ ok: true, hasAvailableSlot: false }, { status: 200 });
    }

    const reservations = await prisma.facility_reservations.findMany({
      where: {
        tenant_id: tenantId,
        facility_id: facilityId,
        slot_id: { in: slotIds },
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
      },
    });

    const reservedSlotIds = new Set(
      reservations
        .map((r) => r.slot_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );

    const hasAvailableSlot = slotIds.some((id) => !reservedSlotIds.has(id));

    logInfo("facility.availability.range_checked", {
      tenantId,
      facilityId,
      start: startParam,
      end: endParam,
      hasAvailableSlot,
    });

    return NextResponse.json({ ok: true, hasAvailableSlot }, { status: 200 });
  } catch (error) {
    logError("facility.availability.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, errorCode: "server_error" as const },
      { status: 500 },
    );
  }
}

