
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

const TYPO_USER_ID = 'ec2990da-f534-4e28-8e53-9d814592b309'; // usre01

async function deleteTypoUser() {
    console.log(`Deleting typo user usre01 (ID: ${TYPO_USER_ID})...`);

    // 1. Delete from user_roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', TYPO_USER_ID);

    // 2. Delete from user_tenants
    await supabaseAdmin.from('user_tenants').delete().eq('user_id', TYPO_USER_ID);

    // 3. Delete from tenant_residents
    await supabaseAdmin.from('tenant_residents').delete().eq('user_id', TYPO_USER_ID);

    // 4. Delete from public.users
    const { error: publicError } = await supabaseAdmin.from('users').delete().eq('id', TYPO_USER_ID);
    if (publicError) console.error('Error deleting public:', publicError);
    else console.log('Deleted from public.users');

    // 5. Delete from auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(TYPO_USER_ID);
    if (authError) console.error('Error deleting auth:', authError);
    else console.log('Deleted from auth.users');
}

deleteTypoUser();
