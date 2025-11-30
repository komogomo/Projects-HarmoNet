
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const TARGET_USER_ID = '755f50d6-95c4-456d-a230-355c4ebf1e21';

async function finalCleanup() {
    console.log(`Final cleanup for ID: ${TARGET_USER_ID}`);

    // 1. Delete from user_roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', TARGET_USER_ID);

    // 2. Delete from user_tenants
    await supabaseAdmin.from('user_tenants').delete().eq('user_id', TARGET_USER_ID);

    // 3. Delete from tenant_residents
    await supabaseAdmin.from('tenant_residents').delete().eq('user_id', TARGET_USER_ID);

    // 4. Delete from public.users
    const { error } = await supabaseAdmin.from('users').delete().eq('id', TARGET_USER_ID);

    if (error) console.error('Error deleting public.users:', error);
    else console.log('Deleted from public.users');
}

finalCleanup();
