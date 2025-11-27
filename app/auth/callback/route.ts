import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") ?? "/home";

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // 1. Get current user from Supabase Auth
            const { data: { user } } = await supabase.auth.getUser();

            if (user?.email) {
                // Use Service Role Client for DB operations to bypass RLS
                const adminClient = createSupabaseServiceRoleClient();

                // 2. Find app user in public.users
                const { data: dbUser } = await adminClient
                    .from("users")
                    .select("id")
                    .eq("email", user.email)
                    .maybeSingle();

                if (dbUser) {
                    // 3. Get tenant memberships from user_tenants
                    // Assuming single tenant for now as per instruction
                    const { data: membership } = await adminClient
                        .from("user_tenants")
                        .select("tenant_id")
                        .eq("user_id", dbUser.id)
                        .maybeSingle();

                    if (membership) {
                        // 4. Get tenant details and check status
                        const { data: tenant } = await adminClient
                            .from("tenants")
                            .select("status")
                            .eq("id", membership.tenant_id)
                            .single();

                        // 5. Check tenant status
                        if (tenant && tenant.status === 'active') {
                            // 6. Login Success
                            return NextResponse.redirect(`${requestUrl.origin}${next}`);
                        }
                    }
                }
            }
        }
    }

    // Auth failed, no code, no user, no membership, or inactive tenant
    return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`);
}
