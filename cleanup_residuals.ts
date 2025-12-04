
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting cleanup of residual test data...');

    // 1. Delete test roles
    const roles = await prisma.roles.findMany({
        where: { role_key: { startsWith: 'test-role-' } }
    });

    if (roles.length > 0) {
        console.log(`Found ${roles.length} test roles. Deleting...`);
        const { count } = await prisma.roles.deleteMany({
            where: { role_key: { startsWith: 'test-role-' } }
        });
        console.log(`✅ Deleted ${count} test roles.`);
    } else {
        console.log('✅ No test roles found.');
    }

    // 2. Delete test permissions (just in case)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
