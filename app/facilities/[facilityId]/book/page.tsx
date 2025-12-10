import React from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { HomeFooterShortcuts } from "@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts";
import FacilityMeetingRoomBookingPage from "@/src/components/facilities/FacilityMeetingRoomBookingPage";
import FacilityParkingBookingPage from "@/src/components/facilities/FacilityParkingBookingPageNew";
import FacilityParkingRangeBookingPage from "@/src/components/facilities/FacilityParkingRangeBookingPage";

interface FacilityBookingPageProps {
  params: Promise<{
    facilityId: string;
  }>;
  searchParams?: Promise<{
    date?: string;
    start?: string;
    end?: string;
  }>;
}

export default async function FacilityBookingPage(props: FacilityBookingPageProps) {
  const { params, searchParams } = props;
  const { facilityId } = await params;

  if (!facilityId) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const dateParam = resolvedSearchParams?.date ?? "";
  const rangeStartParam = resolvedSearchParams?.start ?? "";
  const rangeEndParam = resolvedSearchParams?.end ?? "";

  logInfo("facility.booking.enter", {
    facilityId,
    dateParam,
    rangeStartParam,
    rangeEndParam,
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
      screen: "FacilityBooking",
    });
    redirect("/login?error=no_session");
  }

  if (!user || !user.email) {
    logInfo("auth.callback.no_session", {
      reason: "no_session",
      screen: "FacilityBooking",
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
      screen: "FacilityBooking",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!appUser) {
    logError("auth.callback.unauthorized.user_not_found", {
      screen: "FacilityBooking",
      email,
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
      screen: "FacilityBooking",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!membership || !membership.tenant_id) {
    logError("auth.callback.unauthorized.no_tenant", {
      screen: "FacilityBooking",
      userId: appUser.id,
    });
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  const tenantId = membership.tenant_id as string;

  // 対象施設の取得（テナントスコープ内の facilityId のみ許可）
  const {
    data: facility,
    error: facilityError,
  } = await supabaseAdmin
    .from("facilities")
    .select("id, tenant_id, facility_name, facility_type, description, parkingimage")
    .eq("id", facilityId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (facilityError || !facility) {
    logError("facility.booking.facility_not_found", {
      tenantId,
      facilityId,
      hasError: !!facilityError,
      errorMessage: facilityError?.message ?? null,
    });
    redirect("/facilities");
  }

  const facilityType = (facility.facility_type as string) ?? "";
  const facilityName = (facility.facility_name as string) ?? "";
  const facilityDescription = (facility.description as string | null) ?? null;

  let parkingImageUrl: string | null = null;
  // Supabase の bytea 列は hex 文字列（"\\x8950..."）として返ってくるので、base64 に変換して data URL にする
  const rawParkingImage = (facility as any).parkingimage as string | null | undefined;
  if (typeof rawParkingImage === "string" && rawParkingImage.length > 0) {
    let base64: string;
    if (rawParkingImage.startsWith("\\x") || rawParkingImage.startsWith("\\X")) {
      const hex = rawParkingImage.slice(2);
      base64 = Buffer.from(hex, "hex").toString("base64");
    } else {
      base64 = rawParkingImage;
    }
    parkingImageUrl = `data:image/png;base64,${base64}`;
  }

  // 施設設定の取得（利用時間帯など）
  let availableFromTime: string | null = null;
  let availableToTime: string | null = null;
  let maxParticipants: number | null = null;

  const {
    data: settingsRow,
    error: settingsError,
  } = await supabaseAdmin
    .from("facility_settings")
    .select("available_from_time, available_to_time, max_participants")
    .eq("tenant_id", tenantId)
    .eq("facility_id", facilityId)
    .maybeSingle();

  if (settingsError) {
    logError("facility.booking.settings_error", {
      tenantId,
      facilityId,
      errorMessage: settingsError.message,
    });
  }

  if (settingsRow) {
    availableFromTime = (settingsRow.available_from_time as string | null) ?? null;
    availableToTime = (settingsRow.available_to_time as string | null) ?? null;
    maxParticipants = (settingsRow.max_participants as number | null) ?? null;
  }

  logInfo("facility.booking.context_resolved", {
    userId: appUser.id,
    tenantId,
    facilityId,
    facilityType,
    dateParam,
    rangeStartParam,
    rangeEndParam,
  });

  const isParking = facilityType === "parking";
  const isRangeMode = isParking && !!rangeStartParam && !!rangeEndParam;

  return (
    <>
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
          {isParking ? (
            isRangeMode ? (
              <FacilityParkingRangeBookingPage
                tenantId={tenantId}
                facilityId={facilityId}
                facilityName={facilityName}
                rangeStart={rangeStartParam}
                rangeEnd={rangeEndParam}
                facilityDescription={facilityDescription}
                parkingImageUrl={parkingImageUrl}
              />
            ) : (
              <FacilityParkingBookingPage
                tenantId={tenantId}
                facilityId={facilityId}
                facilityName={facilityName}
                selectedDate={dateParam}
                facilityDescription={facilityDescription}
                availableFromTime={availableFromTime}
                availableToTime={availableToTime}
                parkingImageUrl={parkingImageUrl}
              />
            )
          ) : (
            <FacilityMeetingRoomBookingPage
              tenantId={tenantId}
              facilityId={facilityId}
              facilityName={facilityName}
              selectedDate={dateParam}
              facilityDescription={facilityDescription}
              availableFromTime={availableFromTime}
              availableToTime={availableToTime}
              maxParticipants={maxParticipants}
            />
          )}
        </div>
      </main>
      <HomeFooterShortcuts />
    </>
  );
}

