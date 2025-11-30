
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

const TARGET_USER_ID = '755f50d6-95c4-456d-a230-355c4ebf1a21';

async function cleanupUser() {
    console.log(`Starting cleanup for user ID: ${TARGET_USER_ID}`);

    // 1. Delete from user_roles
    const { error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', TARGET_USER_ID);

    if (rolesError) console.error('Error deleting user_roles:', rolesError);
    else console.log('Deleted from user_roles');

    // 2. Delete from user_tenants
    const { error: tenantsError } = await supabaseAdmin
        .from('user_tenants')
        .delete()
        .eq('user_id', TARGET_USER_ID);

    if (tenantsError) console.error('Error deleting user_tenants:', tenantsError);
    else console.log('Deleted from user_tenants');

    // 3. Delete from tenant_residents (if exists, based on schema knowledge)
    // Checking schema... tenant_residents also has user_id usually? 
    // Based on previous file views, tenant_residents has user_id.
    const { error: residentsError } = await supabaseAdmin
        .from('tenant_residents')
        .delete()
        .eq('user_id', TARGET_USER_ID);

    if (residentsError) {
        // It might not exist or column might be different, but good to try if we want full cleanup
        // If table doesn't exist it will error, which is fine.
        console.log('Note: tenant_residents deletion attempt result:', residentsError.message);
    } else {
        console.log('Deleted from tenant_residents');
    }

    // 4. Delete from public.users
    const { error: usersError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', TARGET_USER_ID);

    if (usersError) console.error('Error deleting public.users:', usersError);
    else console.log('Deleted from public.users');

    // 5. Delete from auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(TARGET_USER_ID);

    if (authError) {
        console.error('Error deleting auth.users:', authError);
    } else {
        console.log('Successfully deleted from auth.users');
    }

    console.log('Cleanup complete.');
}

cleanupUser();
