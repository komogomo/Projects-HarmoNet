
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

async function findUser() {
    console.log('Listing users...');

    // List all users (pagination might be needed if many users, but let's try default)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000
    });

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    console.log(`Found ${users.length} users.`);

    const targetEmail = 'user02@gmail.com';
    const targetId = '755f50d6-95c4-456d-a230-355c4ebf1a21';

    const foundByEmail = users.filter(u => u.email === targetEmail);
    const foundById = users.find(u => u.id === targetId);

    console.log(`Users with email ${targetEmail}:`, foundByEmail.map(u => ({ id: u.id, email: u.email })));
    console.log(`User with ID ${targetId}:`, foundById ? { id: foundById.id, email: foundById.email } : 'Not found');

    if (foundById) {
        console.log('Attempting delete again...');
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(foundById.id);
        if (deleteError) {
            console.error('Delete failed:', deleteError);
        } else {
            console.log('Delete successful');
        }
    }
}

findUser();
