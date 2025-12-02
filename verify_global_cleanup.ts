
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking global tables for residual test data...');

    // Check roles
    const roles = await prisma.roles.findMany({
        where: {
            role_key: { startsWith: 'test-role-' }
        }
    });

    if (roles.length > 0) {
        console.error(`❌ [roles] Found ${roles.length} residual records!`);
        roles.forEach(r => console.log(`   - ${r.role_key} (${r.name})`));
    } else {
        console.log(`✅ [roles] Clean`);
    }

    // Check permissions
    const permissions = await prisma.permissions.findMany({
        where: {
            permission_key: { startsWith: 'test-' }
        }
    });

    if (permissions.length > 0) {
        console.error(`❌ [permissions] Found ${permissions.length} residual records!`);
    } else {
        console.log(`✅ [permissions] Clean`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
