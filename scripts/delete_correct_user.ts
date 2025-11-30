
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

// The CORRECT ID found from debug script
const TARGET_USER_ID = '755f50d6-95c4-456d-a230-355c4ebf1e21';

async function deleteCorrectUser() {
    console.log(`Attempting to delete user with CORRECT ID: ${TARGET_USER_ID}`);

    // 1. Ensure public.users is clean for this ID too (just in case)
    const { error: usersError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', TARGET_USER_ID);

    if (usersError) console.error('Error deleting public.users:', usersError);
    else console.log('Deleted from public.users (if existed)');

    // 2. Delete from auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(TARGET_USER_ID);

    if (authError) {
        console.error('Error deleting auth.users:', authError);
    } else {
        console.log('Successfully deleted from auth.users');
    }
}

deleteCorrectUser();
