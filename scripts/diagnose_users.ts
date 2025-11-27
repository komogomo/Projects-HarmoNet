
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
    console.log('--- Diagnosis Start ---');

    const targetEmails = ['admin@gmail.com', 'user01@gmail.com', 'user02@gmail.com'];

    // 1. List Tenants
    const { data: tenants } = await supabase.from('tenants').select('*');
    console.log('Tenants:', tenants?.map(t => ({ id: t.id, name: t.tenant_name })));

    // 2. Check Public Users
    const { data: users } = await supabase.from('users').select('*').in('email', targetEmails);
    console.log('Public Users (Targeted):', users?.map(u => ({ id: u.id, email: u.email, tenant_id: u.tenant_id })));

    // 3. Check User Tenants
    if (users && users.length > 0) {
        const userIds = users.map(u => u.id);
        const { data: userTenants } = await supabase.from('user_tenants').select('*').in('user_id', userIds);
        console.log('User Tenants (Targeted):', userTenants);
    }

    // 4. Check Auth Users
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    const targetAuthUsers = authUsers.filter(u => targetEmails.includes(u.email || ''));
    console.log('Auth Users (Targeted):', targetAuthUsers.map(u => ({ id: u.id, email: u.email })));

    console.log('--- Diagnosis End ---');
}

diagnose();
