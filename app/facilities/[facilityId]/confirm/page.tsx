import React from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";
import FacilityMeetingRoomConfirm from "@/src/components/facilities/FacilityMeetingRoomConfirm";
import FacilityParkingConfirm from "@/src/components/facilities/FacilityParkingConfirm";

const formatDisplayDateJa = (isoDate: string): string => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;

  const [year, month, day] = parts;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const w = weekdays[date.getDay()] ?? "";

  const mm = month.padStart(2, "0");
  const dd = day.padStart(2, "0");

  return `${year}/${mm}/${dd}${w ? `（${w}）` : ""}`;
};

interface FacilityConfirmPageProps {
  params: Promise<{
    facilityId: string;
  }>;
  searchParams?: Promise<{
    date?: string;
    start?: string;
    end?: string;
    purpose?: string;
    participants?: string;
    slotId?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
  }>;
}

export default async function FacilityConfirmPage(props: FacilityConfirmPageProps) {
  const { params, searchParams } = props;
  const { facilityId } = await params;

  if (!facilityId) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const dateParam = resolvedSearchParams?.date ?? "";
  const startParam = resolvedSearchParams?.start ?? "";
  const endParam = resolvedSearchParams?.end ?? "";
  const purposeParam = resolvedSearchParams?.purpose ?? "";
  const participantsParam = resolvedSearchParams?.participants ?? "";
  const slotIdParam = resolvedSearchParams?.slotId ?? "";
  const vehicleNumberParam = resolvedSearchParams?.vehicleNumber ?? "";
  const vehicleModelParam = resolvedSearchParams?.vehicleModel ?? "";
  const displayDateJa = formatDisplayDateJa(dateParam);

  logInfo("facility.confirm.enter", {
    facilityId,
    dateParam,
    startParam,
    endParam,
    hasPurpose: !!purposeParam,
    hasParticipants: !!participantsParam,
  });

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logError("auth.callback.no_session", {
      reason: authError.message,
      screen: "FacilityConfirm",
    });
    redirect("/login?error=no_session");
  }

  if (!user || !user.email) {
    logInfo("auth.callback.no_session", {
      reason: "no_session",
      screen: "FacilityConfirm",
    });
    redirect("/login?error=no_session");
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

  if (appUserError) {
    logError("auth.callback.db_error", {
      screen: "FacilityConfirm",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!appUser) {
    logError("auth.callback.unauthorized.user_not_found", {
      screen: "FacilityConfirm",
    });
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (membershipError) {
    logError("auth.callback.db_error", {
      screen: "FacilityConfirm",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!membership || !membership.tenant_id) {
    logError("auth.callback.unauthorized.no_tenant", {
      screen: "FacilityConfirm",
      userId: appUser.id,
    });
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  const tenantId = membership.tenant_id as string;

  // 対象施設の取得
  const {
    data: facility,
    error: facilityError,
  } = await supabaseAdmin
    .from("facilities")
    .select("id, tenant_id, facility_name, facility_type")
    .eq("id", facilityId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (facilityError || !facility) {
    logError("facility.confirm.facility_not_found", {
      tenantId,
      facilityId,
      hasError: !!facilityError,
      errorMessage: facilityError?.message ?? null,
    });
    redirect("/facilities");
  }

  const facilityType = (facility.facility_type as string) ?? "";
  const facilityName = (facility.facility_name as string) ?? "";

  logInfo("facility.confirm.context_resolved", {
    userId: appUser.id,
    tenantId,
    facilityId,
    facilityType,
    dateParam,
    startParam,
    endParam,
    hasPurpose: !!purposeParam,
    hasParticipants: !!participantsParam,
    slotId: slotIdParam,
  });

  if (facilityType === "room") {
    if (!dateParam || !startParam || !endParam) {
      redirect(`/facilities/${facilityId}/book`);
    }

    return (
      <>
        <main className="min-h-screen bg-white">
          <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
            <FacilityMeetingRoomConfirm
              tenantId={tenantId}
              facilityId={facilityId}
              facilityName={facilityName}
              date={dateParam}
              displayDate={displayDateJa}
              startTime={startParam}
              endTime={endParam}
              participants={participantsParam || ""}
              purpose={purposeParam || ""}
            />
          </div>
        </main>
        <HomeFooterShortcuts />
      </>
    );
  }

  if (facilityType === "parking") {
    const isRangeMode = !dateParam && !!startParam && !!endParam;

    // range モードでは start/end と slotId があれば確認画面へ進める。単日モードでは date も必須。
    if (
      !startParam ||
      !endParam ||
      !slotIdParam ||
      (!isRangeMode && !dateParam)
    ) {
      redirect(`/facilities/${facilityId}/book`);
    }

    const effectiveDateForDisplay = isRangeMode ? startParam : dateParam;
    const effectiveDisplayDateJa = formatDisplayDateJa(effectiveDateForDisplay);

    const {
      data: slot,
      error: slotError,
    } = await supabaseAdmin
      .from("facility_slots")
      .select("id, slot_name")
      .eq("id", slotIdParam)
      .eq("facility_id", facilityId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (slotError || !slot) {
      logError("facility.confirm.slot_not_found", {
        tenantId,
        facilityId,
        slotId: slotIdParam,
        errorMessage: slotError?.message ?? null,
      });
      redirect(`/facilities/${facilityId}/book`);
    }

    const slotLabel = (slot.slot_name as string) ?? "";

    return (
      <>
        <main className="min-h-screen bg-white">
          <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
            <FacilityParkingConfirm
              tenantId={tenantId}
              facilityId={facilityId}
              facilityName={facilityName}
              date={effectiveDateForDisplay}
              displayDate={effectiveDisplayDateJa}
              startTime={startParam}
              endTime={endParam}
              slotId={slotIdParam}
              slotLabel={slotLabel}
              purpose={purposeParam || ""}
              vehicleNumber={vehicleNumberParam}
              vehicleModel={vehicleModelParam}
            />
          </div>
        </main>
        <HomeFooterShortcuts />
      </>
    );
  }

  redirect(`/facilities/${facilityId}/book`);
}
