
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting verification for residual test-tenant data...');

    const models = [
        'tenants',
        'tenant_settings',
        'tenant_shortcut_menu',
        'users',
        'user_tenants',
        'user_roles',
        'board_categories',
        'board_posts',
        'board_comments',
        'board_attachments',
        'board_approval_logs',
        'board_favorites',
        'announcements',
        'facilities',
        'facility_settings',
        'facility_slots',
        'facility_reservations',
        'moderation_logs',
        'board_post_translations',
        'board_comment_translations'
    ];

    let totalResiduals = 0;

    for (const model of models) {
        try {
            // @ts-ignore
            const count = await prisma[model].count({
                where: {
                    tenant_id: {
                        startsWith: 'test-tenant-'
                    }
                }
            });

            if (count > 0) {
                console.error(`❌ [${model}] Found ${count} residual records!`);
                totalResiduals += count;
            } else {
                console.log(`✅ [${model}] Clean (0 records)`);
            }
        } catch (e: any) {
            console.error(`⚠️ [${model}] Error checking:`, e.message);
        }
    }

    if (totalResiduals === 0) {
        console.log('\n✨ All tables are clean. No "test-tenant-" data found.');
    } else {
        console.error(`\n🚫 Found a total of ${totalResiduals} residual records.`);
        process.exit(1);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
