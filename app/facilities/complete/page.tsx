import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logError } from "@/src/lib/logging/log.util";
import FacilityCompletePage from "@/src/components/facilities/FacilityCompletePage";

export default async function FacilitiesCompleteRoutePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    logError("auth.callback.no_session", {
      reason: authError?.message ?? "no_session",
      screen: "FacilityComplete",
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

  if (appUserError || !appUser) {
    logError("auth.callback.unauthorized.user_not_found", {
      screen: "FacilityComplete",
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

  if (membershipError || !membership || !membership.tenant_id) {
    logError("auth.callback.unauthorized.no_tenant", {
      screen: "FacilityComplete",
      userId: appUser.id,
    });
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  const tenantId = membership.tenant_id as string;

  return <FacilityCompletePage tenantId={tenantId} />;
}
