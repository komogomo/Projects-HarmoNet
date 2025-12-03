
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking for duplicates...');

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
    }

    // Check Tenants
    console.log('\n--- Tenants Check ---');
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

    // Check Facilities
    console.log('\n--- Facilities Check ---');
    // Assuming we want to check for duplicate facility names within the same tenant if possible, 
    // but primarily checking if we have multiple facilities with same name across the board for the target tenant.
    if (tenants.length > 0) {
        const tenantId = tenants[0].id;
        const facilities = await prisma.facilities.findMany({
            where: { tenant_id: tenantId }
        });
        console.log(`Facilities for tenant ${tenantId}:`);
        facilities.forEach(f => console.log(`   - ID: ${f.id}, Name: ${f.facility_name}, Type: ${f.facility_type}`));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
