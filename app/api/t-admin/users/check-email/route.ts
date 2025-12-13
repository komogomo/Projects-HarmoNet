import { NextRequest, NextResponse } from 'next/server';
import { getTenantAdminApiContext, TenantAdminApiError } from '@/src/lib/auth/tenantAdminAuth';
import { logError } from '@/src/lib/logging/log.util';

const errorJson = (status: number, errorCode: string, messageKey: string) =>
    NextResponse.json({ ok: false, errorCode, messageKey, message: messageKey }, { status });

export async function POST(request: NextRequest) {
    try {
        const { supabaseAdmin } = await getTenantAdminApiContext();

        const body = await request.json();
        const { email } = body;

        if (!email) {
            return errorJson(400, 'VALIDATION_ERROR', 'tadmin.users.error.validation');
        }

        // Check existence in public.users
        const { data: existingUser, error } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            logError('tadmin.users.check_email.db_error', {
                errorMessage: (error as any)?.message ?? 'unknown',
            });
            return errorJson(500, 'INTERNAL_ERROR', 'tadmin.users.error.internal');
        }

        return NextResponse.json({ ok: true, exists: !!existingUser });
    } catch (error) {
        if (error instanceof TenantAdminApiError) {
            if (error.code === 'unauthorized') {
                return errorJson(401, 'unauthorized', 'tadmin.users.error.internal');
            }
            if (error.code === 'tenant_not_found') {
                return errorJson(403, 'tenant_not_found', 'tadmin.users.error.internal');
            }
            if (error.code === 'forbidden') {
                return errorJson(403, 'forbidden', 'tadmin.users.error.internal');
            }
        }

        throw error;
    }
}
