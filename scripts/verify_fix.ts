
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function verifyCreation() {
    console.log('Verifying user creation fix...');

    // Simulate the payload that was failing
    const testUser = {
        id: 'test-fix-user-id', // Dummy ID
        tenant_id: 'ab3d5d5f-027b-4108-b6aa-2a31941d88eb', // From previous logs
        email: 'testfix@gmail.com',
        display_name: 'Test Fix',
        full_name: 'Test Fix User',
        full_name_kana: 'Test Fix User Kana',
        group_code: 'GRP_TEST',
        residence_code: '999',
        language: 'ja',
        updated_at: new Date().toISOString() // This is what we added
    };

    // Attempt upsert directly to users table (mimicking API behavior)
    const { error } = await supabase
        .from('users')
        .upsert(testUser);

    if (error) {
        console.error('Verification Failed:', error);
    } else {
        console.log('Verification Success: User upserted without error.');
        // Cleanup
        await supabase.from('users').delete().eq('id', testUser.id);
    }
}

verifyCreation();
