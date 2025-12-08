import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const tokenHash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type") ?? "email";
    const next = requestUrl.searchParams.get("next") ?? "/home";

    const supabase = await createSupabaseServerClient();

    let authError: unknown = null;

    // 1. PKCE / token_hash フローを優先 (Supabase 公式推奨パターン)
    if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
        authError = error;
    } else if (code) {
        // 2. 既存の code ベースフローも後方互換として残す
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        authError = error;
    } else {
        // code も token_hash も無い場合は即座にログイン画面へ
        return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`);
    }

    if (authError) {
        return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`);
    }

    // ここから下は、既存のテナント判定・リダイレクトロジックを維持
    const {
        data: { user },
    } = await supabase.auth.getUser();

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
            // 2.5. Check if redirecting to system admin pages
            if (next.startsWith("/sys-admin")) {
                // Check system admin role
                const { data: roles } = await adminClient
                    .from("user_roles")
                    .select("roles(scope, role_key)")
                    .eq("user_id", dbUser.id);

                const isSystemAdmin =
                    Array.isArray(roles) &&
                    roles.some(
                        (row: any) =>
                            row.roles?.scope === "system_admin" &&
                            row.roles?.role_key === "system_admin",
                    );

                if (isSystemAdmin) {
                    return NextResponse.redirect(`${requestUrl.origin}${next}`);
                }
                // If not system admin, fall through to normal tenant check or fail
            }

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

    // Auth failed, no user, no membership, or inactive tenant
    return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`);
}
