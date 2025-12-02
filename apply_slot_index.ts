import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== slot_id インデックス追加 開始 ===');

    // facility_reservations.slot_id
    try {
        console.log('Applying index: facility_reservations_slot_id_idx...');
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "facility_reservations_slot_id_idx" ON "facility_reservations" ("slot_id");`);
        console.log('  -> OK');
    } catch (e) {
        console.error(`  -> Failed: ${e}`);
    }

    console.log('=== slot_id インデックス追加 完了 ===');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
