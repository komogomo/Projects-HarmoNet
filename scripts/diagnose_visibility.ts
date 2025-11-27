
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

async function diagnose() {
    console.log('--- Focused Diagnosis Start ---');

    const emails = ['admin@gmail.com', 'user01@gmail.com', 'user02@gmail.com', 'admin01@gmail.com'];

    // 1. Get User IDs
    const { data: users } = await supabase.from('users').select('id, email, tenant_id').in('email', emails);

    if (!users) {
        console.log("No users found");
        return;
    }

    console.log('Users Table Data:');
    users.forEach(u => console.log(`- ${u.email}: ID=${u.id}, TenantID=${u.tenant_id}`));

    const userIds = users.map(u => u.id);

    // 2. Get User Tenants
    const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('user_id, tenant_id')
        .in('user_id', userIds);

    console.log('\nUser_Tenants Table Data:');
    userTenants?.forEach(ut => {
        const email = users.find(u => u.id === ut.user_id)?.email;
        console.log(`- User ${email} (${ut.user_id}) is in Tenant ${ut.tenant_id}`);
    });

    // 3. Check for mismatches
    const adminUser = users.find(u => u.email === 'admin@gmail.com');
    if (adminUser) {
        const adminTenantId = adminUser.tenant_id; // Or from user_tenants
        console.log(`\nAdmin Tenant ID (from users table): ${adminTenantId}`);

        const adminTenantEntry = userTenants?.find(ut => ut.user_id === adminUser.id);
        console.log(`Admin Tenant ID (from user_tenants): ${adminTenantEntry?.tenant_id}`);

        const targetTenantId = adminTenantEntry?.tenant_id || adminTenantId;

        console.log(`\nChecking visibility for Tenant ${targetTenantId}:`);
        users.forEach(u => {
            if (u.email === 'admin@gmail.com') return;

            const userTenantEntry = userTenants?.find(ut => ut.user_id === u.id && ut.tenant_id === targetTenantId);
            const isSameTenantInUsers = u.tenant_id === targetTenantId;

            if (userTenantEntry || isSameTenantInUsers) {
                console.log(`[OK] ${u.email} should be visible.`);
            } else {
                console.log(`[FAIL] ${u.email} is NOT linked to this tenant.`);
                console.log(`       users.tenant_id: ${u.tenant_id}`);
                console.log(`       user_tenants: ${userTenants?.filter(ut => ut.user_id === u.id).map(ut => ut.tenant_id).join(', ')}`);
            }
        });
    }

    console.log('--- Focused Diagnosis End ---');
}

diagnose();
