
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- Checking Public Users ---');
    const { data: publicUsers, error: pubError } = await supabase
        .from('users')
        .select('id, email, display_name')
        .in('email', ['user02@gmail.com', 'user02@gmial.com', 'user03@gmail.com']);

    if (pubError) console.error(pubError);
    else console.log(JSON.stringify(publicUsers, null, 2));

    console.log('\n--- Checking Auth Users ---');
    // List users to find them in Auth
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({
        perPage: 1000
    });

    if (listError) {
        console.error(listError);
    } else {
        const targets = authUsers.users.filter(u =>
            ['user02@gmail.com', 'user02@gmial.com', 'user03@gmail.com'].includes(u.email?.toLowerCase() || '')
        );
        console.log(JSON.stringify(targets.map(u => ({ id: u.id, email: u.email })), null, 2));
    }
}

main();
