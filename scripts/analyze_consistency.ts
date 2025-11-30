
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

async function analyzeConsistency() {
    console.log('Starting consistency analysis...');

    // 1. Fetch all Auth Users
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (authError) { console.error('Auth error:', authError); return; }
    console.log(`Auth Users: ${authUsers.length}`);

    // 2. Fetch all Public Users
    const { data: publicUsers, error: publicError } = await supabaseAdmin.from('users').select('*');
    if (publicError) { console.error('Public error:', publicError); return; }
    console.log(`Public Users: ${publicUsers.length}`);

    // 3. Analyze
    const authMap = new Map(authUsers.map(u => [u.id, u]));
    const publicMap = new Map(publicUsers.map(u => [u.id, u]));

    // A. Missing in Public (exist in Auth)
    const missingInPublic = authUsers.filter(u => !publicMap.has(u.id));

    // B. Orphans in Public (missing in Auth)
    const orphansInPublic = publicUsers.filter(u => !authMap.has(u.id));

    // C. Mismatches (Email)
    const mismatches = [];
    for (const [id, authUser] of authMap) {
        const publicUser = publicMap.get(id);
        if (publicUser) {
            if (authUser.email?.toLowerCase() !== publicUser.email?.toLowerCase()) {
                mismatches.push({
                    id,
                    authEmail: authUser.email,
                    publicEmail: publicUser.email
                });
            }
        }
    }

    console.log('\n--- Analysis Results ---');

    if (missingInPublic.length > 0) {
        console.log(`\n[MISSING IN PUBLIC] (${missingInPublic.length} records):`);
        missingInPublic.forEach(u => console.log(` - ID: ${u.id}, Email: ${u.email}`));
    } else {
        console.log('\n[MISSING IN PUBLIC]: None');
    }

    if (orphansInPublic.length > 0) {
        console.log(`\n[ORPHANS IN PUBLIC] (${orphansInPublic.length} records - To be deleted):`);
        orphansInPublic.forEach(u => console.log(` - ID: ${u.id}, Email: ${u.email}`));
    } else {
        console.log('\n[ORPHANS IN PUBLIC]: None');
    }

    if (mismatches.length > 0) {
        console.log(`\n[EMAIL MISMATCHES] (${mismatches.length} records - To be updated):`);
        mismatches.forEach(m => console.log(` - ID: ${m.id}, Auth: ${m.authEmail} vs Public: ${m.publicEmail}`));
    } else {
        console.log('\n[EMAIL MISMATCHES]: None');
    }
}

analyzeConsistency();
