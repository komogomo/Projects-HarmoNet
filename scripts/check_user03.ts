
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

async function checkUser03() {
    console.log('Checking user03 status...');
    const email = 'user03@gmail.com';

    // 1. Check Public Users
    const { data: publicUser, error: publicError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (publicError) console.error('Public query error:', publicError);
    console.log('Public User (user03):', publicUser);

    // 2. Check Auth Users
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000
    });

    if (authError) console.error('Auth list error:', authError);

    const authUser = users.find(u => u.email === email);
    console.log('Auth User (user03):', authUser ? { id: authUser.id, email: authUser.email } : 'Not found');

    // 3. Check if any OTHER public user has the email (just in case)
    // Already done by step 1.
}

checkUser03();
