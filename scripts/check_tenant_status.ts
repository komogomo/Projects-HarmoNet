import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserTenant() {
    const email = 'user01@gmail.com';

    console.log(`Checking for user: ${email}`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error listing users:', userError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found');
        return;
    }

    console.log(`User ID: ${user.id}`);

    // 2. Check user_tenants
    const { data: userTenants, error: utError } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', user.id);

    if (utError) {
        console.error('Error fetching user_tenants:', utError);
        return;
    }

    console.log('User Tenants:', JSON.stringify(userTenants, null, 2));

    if (userTenants && userTenants.length > 0) {
        for (const ut of userTenants) {
            console.log(`UserTenant Status: ${ut.status}`);

            const { data: tenant, error: tError } = await supabase
                .from('tenants')
                .select('tenant_name')
                .eq('id', ut.tenant_id)
                .single();

            if (tError) {
                console.error(`Error fetching tenant ${ut.tenant_id}:`, tError);
            } else {
                console.log(`Tenant Name: ${tenant.tenant_name}`);
            }
        }
    } else {
        console.log('No user_tenants found.');
    }
}

checkUserTenant();
