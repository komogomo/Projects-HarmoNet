
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- Users ---');
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, tenant_id, display_name');

    if (usersError) console.error(usersError);
    else console.log(JSON.stringify(users, null, 2));

    console.log('\n--- User Tenants ---');
    const { data: userTenants, error: utError } = await supabase
        .from('user_tenants')
        .select('user_id, tenant_id');

    if (utError) console.error(utError);
    else console.log(JSON.stringify(userTenants, null, 2));

    console.log('\n--- Tenants ---');
    const { data: tenants, error: tError } = await supabase
        .from('tenants')
        .select('id, tenant_name');

    if (tError) console.error(tError);
    else console.log(JSON.stringify(tenants, null, 2));
}

main();
