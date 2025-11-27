
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

async function simulateApi() {
    console.log('--- Simulating API Fetch ---');

    const tenantId = 'ab3d5d5f-027b-4108-b6aa-2a31941d88eb'; // Known tenant ID
    console.log(`Tenant ID: ${tenantId}`);

    // 1. Fetch Users
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, display_name, full_name, full_name_kana, group_code, residence_code, language')
        .eq('tenant_id', tenantId);

    if (usersError) {
        console.error('Users fetch error:', usersError);
        return;
    }

    console.log(`Fetched ${usersData?.length} users from DB.`);
    usersData?.forEach(u => console.log(`- ${u.email} (${u.id})`));

    if (!usersData || usersData.length === 0) {
        console.log("No users found in DB query.");
        return;
    }

    const userIds = usersData.map(u => u.id);

    // 2. Fetch Roles
    const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, roles(role_key)')
        .eq('tenant_id', tenantId)
        .in('user_id', userIds);

    if (rolesError) {
        console.error('Roles fetch error:', rolesError);
        return;
    }

    console.log(`Fetched ${rolesData?.length} role entries.`);

    // 3. Combine
    const roleMap = new Map();
    rolesData?.forEach((r: any) => {
        roleMap.set(r.user_id, r.roles?.role_key);
    });

    const result = usersData.map(user => {
        return {
            userId: user.id,
            email: user.email || '',
            roleKey: roleMap.get(user.id) || 'general_user',
        };
    });

    console.log('Final Result DTOs:');
    result.forEach(r => console.log(`- ${r.email}: ${r.roleKey}`));

    console.log('--- Simulation End ---');
}

simulateApi();
