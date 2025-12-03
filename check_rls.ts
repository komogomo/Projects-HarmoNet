
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking RLS and Policies for translation tables...');

    const tables = ['reservation_history'];

    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);

        try {
            // Check Policies
            const policies = await prisma.$queryRaw`
        SELECT 
          polname, 
          polcmd, 
          polroles,
          pg_get_expr(polqual, polrelid) as policy_using,
          pg_get_expr(polwithcheck, polrelid) as policy_with_check
        FROM pg_policy 
        WHERE polrelid = ${table}::regclass;
      `;
            console.log('Policies:', JSON.stringify(policies, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
                , 2));
        } catch (e: any) {
            console.error(`Error checking table ${table}:`, e.message);
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
