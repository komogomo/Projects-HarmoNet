
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking for duplicates (JS version)...');

    // Check Users
    const targetEmails = [
        'ttakeda43+user1@gmail.com',
        'ttakeda43@gmail.com',
        'ttakeda43+admin@gmail.com',
        'ttakeda43+sysadmin@gmail.com',
        'admin@gmail.com',
        'user01@gmail.com'
    ];

    console.log('\n--- Users Check ---');
    for (const email of targetEmails) {
        try {
            const users = await prisma.users.findMany({
                where: { email: email },
                select: { id: true, email: true, tenant_id: true, created_at: true, display_name: true }
            });

            if (users.length > 1) {
                console.log(`❌ Duplicate found for ${email}: ${users.length} records`);
                users.forEach(u => console.log(`   - ID: ${u.id}, Tenant: ${u.tenant_id}, Created: ${u.created_at}, Name: ${u.display_name}`));
            } else if (users.length === 1) {
                console.log(`✅ Single record for ${email}: ID: ${users[0].id}`);
            } else {
                console.log(`⚪ No record for ${email}`);
            }
        } catch (e) {
            console.error(`Error checking ${email}:`, e);
        }
    }

    // Check Tenants
    console.log('\n--- Tenants Check ---');
    try {
        const tenants = await prisma.tenants.findMany({
            where: { tenant_code: 'SEC001' }
        });
        if (tenants.length > 1) {
            console.log(`❌ Duplicate found for SEC001: ${tenants.length} records`);
            tenants.forEach(t => console.log(`   - ID: ${t.id}, Code: ${t.tenant_code}, Created: ${t.created_at}`));
        } else if (tenants.length === 1) {
            console.log(`✅ Single record for SEC001: ID: ${tenants[0].id}`);
        } else {
            console.log(`⚪ No record for SEC001`);
        }
    } catch (e) {
        console.error('Error checking tenants:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
