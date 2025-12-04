
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

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
