const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUserStatus(email) {
    console.log(`Checking status for: ${email}`);

    // 1. users テーブル確認
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (userError) {
        console.error('Error fetching user:', userError);
        return;
    }

    if (!user) {
        console.log('User not found in public.users');
        return;
    }

    console.log('User found:', {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        display_name: user.display_name
    });

    // 2. user_tenants テーブル確認
    const { data: tenants, error: tenantsError } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', user.id);

    if (tenantsError) {
        console.error('Error fetching user_tenants:', tenantsError);
    } else {
        console.log('User Tenants:', tenants);
        if (tenants.length === 0) {
            console.log('WARNING: No user_tenants record found! (Login will fail)');
        }
    }

    // 3. user_roles テーブル確認
    const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
      *,
      roles (
        role_key,
        name
      )
    `)
        .eq('user_id', user.id);

    if (rolesError) {
        console.error('Error fetching user_roles:', rolesError);
    } else {
        console.log('User Roles:', userRoles.map(ur => ({
            tenant_id: ur.tenant_id,
            role_key: ur.roles?.role_key,
            role_name: ur.roles?.name
        })));
    }
}

verifyUserStatus('admin02@gmail.com');
