import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== 重複インデックス（旧ユニーク制約）削除 開始 ===');

    // announcement_reads
    // 警告: Table public.announcement_reads has identical indexes {announcement_reads_announcement_id_user_id_key, announcement_reads_pkey}.
    // 対応: 旧ユニーク制約のインデックスを削除する
    try {
        console.log('Dropping index: announcement_reads_announcement_id_user_id_key...');
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "announcement_reads_announcement_id_user_id_key";`);
        console.log('  -> OK');
    } catch (e) {
        console.error(`  -> Failed: ${e}`);
    }

    console.log('=== 重複インデックス（旧ユニーク制約）削除 完了 ===');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
