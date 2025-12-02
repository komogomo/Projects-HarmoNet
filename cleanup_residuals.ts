
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
    const permissions = await prisma.permissions.findMany({
        where: { permission_key: { startsWith: 'test-' } }
    });

    if (permissions.length > 0) {
        console.log(`Found ${permissions.length} test permissions. Deleting...`);
        const { count } = await prisma.permissions.deleteMany({
            where: { permission_key: { startsWith: 'test-' } }
        });
        console.log(`✅ Deleted ${count} test permissions.`);
    } else {
        console.log('✅ No test permissions found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
