import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logInfo, logError } from '@/src/lib/logging/log.util';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
        }

        const supabase = createSupabaseServiceRoleClient();

        // 管理者権限でユーザーを検索
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            logError('auth.check_email.error', { email, error });
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const exists = !!data;

        logInfo('auth.check_email.result', { email, exists });

        return NextResponse.json({ exists });
    } catch (error) {
        logError('auth.check_email.unexpected', { error });
        return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
    }
}
