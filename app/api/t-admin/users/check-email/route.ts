import { NextRequest, NextResponse } from 'next/server';
import { getTenantAdminApiContext, TenantAdminApiError } from '@/src/lib/auth/tenantAdminAuth';

export async function POST(request: NextRequest) {
    try {
        const { supabaseAdmin } = await getTenantAdminApiContext();

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
    } catch (error) {
        if (error instanceof TenantAdminApiError) {
            if (error.code === 'unauthorized') {
                return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
            }
            if (error.code === 'tenant_not_found') {
                return NextResponse.json({ ok: false, message: 'Tenant not found' }, { status: 403 });
            }
            if (error.code === 'forbidden') {
                return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
            }
        }

        throw error;
    }
}
