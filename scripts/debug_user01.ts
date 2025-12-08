
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

async function debugUser01() {
    console.log('Checking user01...');

    // 1. Search Public Users by email (like user01)
    const { data: publicUsers, error: publicError } = await supabaseAdmin
        .from('users')
        .select('*')
        .ilike('email', '%user01%');

    if (publicError) console.error('Public error:', publicError);
    console.log(`Public Users (like user01): ${publicUsers?.length}`);
    publicUsers?.forEach(u => console.log(` - ID: ${u.id}, Email: ${u.email}, Name: ${u.display_name}`));

    // 2. Search Auth Users by email
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (authError) console.error('Auth error:', authError);

    const targetAuthUsers = authUsers.filter(u => u.email?.includes('user01') || u.email?.includes('usre01')); // Check for typo too
    console.log(`Auth Users (like user01/usre01): ${targetAuthUsers.length}`);
    targetAuthUsers.forEach(u => console.log(` - ID: ${u.id}, Email: ${u.email}`));

    // 3. Check for exact email duplication in Public
    const { data: allPublic } = await supabaseAdmin.from('users').select('email, id');
    if (!allPublic) {
        console.log('\nNo duplicate emails found in Public.');
        return;
    }

    const emailCounts: Record<string, number> = {};
    allPublic.forEach(u => {
        const e = u.email?.toLowerCase();
        if (e) emailCounts[e] = (emailCounts[e] || 0) + 1;
    });

    const duplicates = Object.entries(emailCounts).filter(([k, v]) => v > 1);
    if (duplicates.length > 0) {
        console.log('\n[DUPLICATE EMAILS IN PUBLIC]:');
        duplicates.forEach(([email, count]) => {
            console.log(` - ${email}: ${count} records`);
            const records = allPublic.filter(u => u.email?.toLowerCase() === email);
            records.forEach(r => console.log(`   > ID: ${r.id}`));
        });
    } else {
        console.log('\nNo duplicate emails found in Public.');
    }
}

debugUser01();
