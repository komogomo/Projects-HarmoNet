
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

async function seedUsers() {
    console.log('Seeding users...');

    // 1. Get Tenant ID (assuming there's at least one tenant)
    const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);

    if (tenantError || !tenants || tenants.length === 0) {
        console.error('No tenant found.');
        return;
    }

    const tenantId = tenants[0].id;
    console.log(`Using Tenant ID: ${tenantId}`);

    // 2. Define Users
    const users = [
        {
            email: 'user01@gmail.com',
            password: 'password123',
            displayName: 'User 01',
            fullName: 'User One',
            fullNameKana: 'User One Kana',
            groupCode: 'GRP_A',
            roleKey: 'general_user',
        },
        {
            email: 'user02@gmail.com',
            password: 'password123',
            displayName: 'User 02',
            fullName: 'User Two',
            fullNameKana: 'User Two Kana',
            groupCode: 'GRP_B',
            roleKey: 'general_user',
        },
        {
            email: 'admin01@gmail.com',
            password: 'password123',
            displayName: 'Admin 01',
            fullName: 'Admin One',
            fullNameKana: 'Admin One Kana',
            groupCode: 'GRP_C',
            roleKey: 'tenant_admin',
        },
    ];

    for (const u of users) {
        console.log(`Processing ${u.email}...`);

        // Check if user exists in Auth
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
        let authUser = authUsers.find((au) => au.email === u.email);
        let userId;

        if (!authUser) {
            console.log(`Creating Auth User: ${u.email}`);
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true,
                user_metadata: { display_name: u.displayName },
            });
            if (createError) {
                console.error(`Error creating auth user ${u.email}:`, createError);
                continue;
            }
            userId = newUser.user.id;
        } else {
            console.log(`Auth User exists: ${u.email}`);
            userId = authUser.id;
            // Update password just in case
            await supabase.auth.admin.updateUserById(userId, { password: u.password });
        }

        // Upsert public.users
        const { error: upsertError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                tenant_id: tenantId,
                email: u.email,
                display_name: u.displayName,
                full_name: u.fullName,
                full_name_kana: u.fullNameKana,
                group_code: u.groupCode,
                residence_code: '101', // Dummy
                language: 'ja',
                updated_at: new Date().toISOString(),
            });

        if (upsertError) {
            console.error(`Error upserting public user ${u.email}:`, upsertError);
        }

        // Upsert user_tenants
        await supabase
            .from('user_tenants')
            .upsert({ user_id: userId, tenant_id: tenantId }, { onConflict: 'user_id, tenant_id' });

        // Get Role ID
        const { data: roleData } = await supabase
            .from('roles')
            .select('id')
            .eq('role_key', u.roleKey)
            .single();

        if (roleData) {
            // Upsert user_roles
            // First delete to ensure clean state (optional but safe)
            await supabase.from('user_roles').delete().eq('user_id', userId).eq('tenant_id', tenantId);

            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    tenant_id: tenantId,
                    role_id: roleData.id,
                });

            if (roleError) {
                console.error(`Error inserting role for ${u.email}:`, roleError);
            }
        }
    }

    console.log('Seeding completed.');
}

seedUsers();
