
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenantCode = 'test-tenant-1764644064828';
    console.log(`Searching for tenant with code: ${tenantCode}`);

    const tenant = await prisma.tenants.findUnique({
        where: { tenant_code: tenantCode },
    });

    if (!tenant) {
        console.log('Tenant not found');
        return;
    }

    console.log(`Tenant found: ${tenant.id}`);

    const users = await prisma.users.findMany({
        where: { tenant_id: tenant.id },
        select: { id: true, email: true, display_name: true },
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
        console.log(`- ID: "${u.id}" (UUID check: ${isUUID(u.id)}) | Email: ${u.email}`);
    });
}

function isUUID(str: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(str);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
