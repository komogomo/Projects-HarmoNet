import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import FacilityTopPage from "@/src/components/facility/FacilityTopPage/FacilityTopPage";

export default async function FacilitiesPage() {
  logInfo("facility.top.enter");

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError("auth.callback.no_session", {
      reason: authError?.message ?? "no_session",
      screen: "FacilityTop",
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
      screen: "FacilityTop",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!appUser) {
    logError("auth.callback.unauthorized.user_not_found", {
      screen: "FacilityTop",
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
      screen: "FacilityTop",
    });
    await supabase.auth.signOut();
    redirect("/login?error=server_error");
  }

  if (!membership || !membership.tenant_id) {
    logError("auth.callback.unauthorized.no_tenant", {
      screen: "FacilityTop",
      userId: appUser.id,
    });
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  const tenantId = membership.tenant_id as string;

  logInfo("facility.top.context_resolved", {
    userId: appUser.id,
    tenantId,
  });

  // テナント名の取得（ServiceRole経由）
  let tenantName = "";
  try {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("tenant_name")
      .eq("id", tenantId)
      .single();

    if (tenant?.tenant_name) {
      tenantName = tenant.tenant_name as string;
    }
  } catch {
    // テナント名取得に失敗しても画面表示は続行する
  }

  // 施設一覧の取得（ServiceRole 経由）
  const { data: facilityRows, error: facilityError } = await supabaseAdmin
    .from("facilities")
    .select("id, facility_name, facility_type")
    .eq("tenant_id", tenantId)
    .order("facility_name", { ascending: true });

  if (facilityError) {
    logError("facility.top.facilities_error", {
      tenantId,
      errorMessage: facilityError.message,
    });
  }

  const facilities = (facilityRows ?? []).map((row) => ({
    id: row.id as string,
    name: (row.facility_name as string) ?? "",
    type: (row.facility_type as string) ?? "",
  }));

  logInfo("facility.top.facilities_loaded", {
    tenantId,
    count: facilities.length,
  });

  // 施設設定の取得
  let settingsMap: Record<
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
  > = {};

  if (facilities.length > 0) {
    const facilityIds = facilities.map((f) => f.id);

    const { data: settingsRows, error: settingsError } = await supabaseAdmin
      .from("facility_settings")
      .select(
        "facility_id, available_from_time, available_to_time, fee_per_day, fee_unit, max_consecutive_days, reservable_until_months, min_reservation_minutes",
      )
      .eq("tenant_id", tenantId)
      .in("facility_id", facilityIds);

    if (settingsError) {
      logError("facility.top.settings_error", {
        tenantId,
        errorMessage: settingsError.message,
      });
    }

    for (const row of settingsRows ?? []) {
      const facilityId = row.facility_id as string;
      settingsMap[facilityId] = {
        availableFromTime: (row.available_from_time as string) ?? null,
        availableToTime: (row.available_to_time as string) ?? null,
        feePerDay: (row.fee_per_day as number | null) ?? null,
        feeUnit: (row.fee_unit as string | null) ?? null,
        maxConsecutiveDays: (row.max_consecutive_days as number | null) ?? null,
        reservableUntilMonths: (row.reservable_until_months as number | null) ?? null,
        minReservationMinutes: (row.min_reservation_minutes as number | null) ?? null,
      };
    }
  }

  // tenant_settings から facility usageNotes を取得
  const { data: tenantSettingsRows } = await supabase
    .from("tenant_settings")
    .select("config_json")
    .eq("tenant_id", tenantId)
    .limit(1);

  const rawConfigValue = tenantSettingsRows?.[0]?.config_json as unknown;
  let config: any = {};

  if (typeof rawConfigValue === "string") {
    try {
      config = JSON.parse(rawConfigValue) as any;
    } catch {
      config = {};
    }
  } else if (typeof rawConfigValue === "object" && rawConfigValue !== null) {
    config = rawConfigValue;
  }

  let facilitySection: any = config.facility ?? {};
  if (typeof facilitySection === "string") {
    try {
      facilitySection = JSON.parse(facilitySection) as any;
    } catch {
      facilitySection = {};
    }
  }

  const usageNotesRaw = (facilitySection?.usageNotes ?? null) as unknown;
  const usageNotesMap: Record<string, { ja?: string; en?: string; zh?: string }> = {};

  if (usageNotesRaw && typeof usageNotesRaw === "object") {
    for (const [facilityId, notes] of Object.entries(usageNotesRaw as Record<string, any>)) {
      if (notes && typeof notes === "object") {
        usageNotesMap[facilityId] = {
          ja: typeof (notes as any).ja === "string" ? (notes as any).ja : undefined,
          en: typeof (notes as any).en === "string" ? (notes as any).en : undefined,
          zh: typeof (notes as any).zh === "string" ? (notes as any).zh : undefined,
        };
      }
    }
  }

  // 予約可能期間（日数）の設定（テナント設定で未指定の場合はデフォルト3日）
  let maxReservableDays = 3;
  const rawMaxDays = (facilitySection?.maxReservableDays ?? null) as unknown;
  if (typeof rawMaxDays === "number" && Number.isFinite(rawMaxDays) && rawMaxDays > 0) {
    maxReservableDays = Math.floor(rawMaxDays);
  }

  return (
    <FacilityTopPage
      tenantId={tenantId}
      tenantName={tenantName}
      facilities={facilities}
      settings={settingsMap}
      usageNotes={usageNotesMap}
      maxReservableDays={maxReservableDays}
    />
  );
}
