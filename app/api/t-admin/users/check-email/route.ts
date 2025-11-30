import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';

// Admin client for accessing public.users without RLS restrictions (service_role). Centralized initialization.
const supabaseAdmin = createSupabaseServiceRoleClient();

export async function POST(request: NextRequest) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Basic tenant check to ensure user is a tenant admin
    const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

    if (!userTenant) return NextResponse.json({ ok: false, message: 'Tenant not found' }, { status: 403 });

    // Check role
    const { data: userRoles } = await supabase
        .from('user_roles')
        .select('roles(role_key)')
        .eq('user_id', user.id)
        .eq('tenant_id', userTenant.tenant_id);

    const isTenantAdmin = userRoles?.some((r: any) => r.roles?.role_key === 'tenant_admin');
    if (!isTenantAdmin) {
        return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
        return NextResponse.json({ ok: false, message: 'Email required' }, { status: 400 });
    }

    // Check existence in public.users
    const { data: existingUser, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error('Check email error:', error);
        return NextResponse.json({ ok: false, message: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, exists: !!existingUser });
}
