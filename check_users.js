
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Listing all users and tenants...');

    console.log('\n--- Tenants ---');
    const tenants = await prisma.tenants.findMany();
    tenants.forEach(t => {
        console.log(`[${t.tenant_code}] ID: ${t.id}, Name: ${t.tenant_name}`);
    });

    console.log('\n--- Users ---');
    const users = await prisma.users.findMany({
        orderBy: { email: 'asc' }
    });
    users.forEach(u => {
        console.log(`[${u.email}] ID: ${u.id}, Name: ${u.display_name}, Tenant: ${u.tenant_id}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
