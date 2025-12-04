
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

async function syncUsers() {
    console.log('Starting synchronization...');

    // 1. Fetch all Auth Users
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (authError) { console.error('Auth error:', authError); return; }

    // 2. Fetch all Public Users
    const { data: publicUsers, error: publicError } = await supabaseAdmin.from('users').select('*');
    if (publicError) { console.error('Public error:', publicError); return; }

    const authMap = new Map(authUsers.map(u => [u.id, u]));
    const publicMap = new Map(publicUsers.map(u => [u.id, u]));

    // --- A. Delete Orphans (Public users not in Auth) ---
    const orphansInPublic = publicUsers.filter(u => !authMap.has(u.id));
    console.log(`\nFound ${orphansInPublic.length} orphans to delete.`);

    for (const orphan of orphansInPublic) {
        console.log(`Deleting orphan ID: ${orphan.id} (${orphan.email})`);

        // Delete related records first to avoid FK errors
        await supabaseAdmin.from('user_roles').delete().eq('user_id', orphan.id);
        await supabaseAdmin.from('user_tenants').delete().eq('user_id', orphan.id);

        const { error } = await supabaseAdmin.from('users').delete().eq('id', orphan.id);
        if (error) console.error(`Error deleting ${orphan.id}:`, error.message);
        else console.log(`Deleted ${orphan.id}`);
    }

    // --- B. Insert Missing (Auth users not in Public) ---
    const missingInPublic = authUsers.filter(u => !publicMap.has(u.id));
    console.log(`\nFound ${missingInPublic.length} missing users to insert.`);

    for (const authUser of missingInPublic) {
        console.log(`Inserting missing user ID: ${authUser.id} (${authUser.email})`);

        // Try to find tenant_id from user_tenants if exists
        const { data: userTenant } = await supabaseAdmin
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', authUser.id)
            .maybeSingle();

        let tenantId = userTenant?.tenant_id;

        if (!tenantId) {
            // Fallback: Get the first tenant from tenants table
            const { data: firstTenant } = await supabaseAdmin
                .from('tenants')
                .select('id')
                .limit(1)
                .single();
            tenantId = firstTenant?.id;
        }

        if (!tenantId) {
            console.error(`Skipping ${authUser.id}: No tenant_id found and no default tenant available.`);
            continue;
        }

        const { error } = await supabaseAdmin.from('users').insert({
            id: authUser.id,
            email: authUser.email,
            tenant_id: tenantId,
            display_name: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Unknown',
            // Default values for required fields if missing
            updated_at: new Date().toISOString()
        });

        if (error) console.error(`Error inserting ${authUser.id}:`, error.message);
        else console.log(`Inserted ${authUser.id}`);
    }

    console.log('\nSynchronization complete.');
}

syncUsers();
