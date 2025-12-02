import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== 重複インデックス削除 開始 ===');

    // 1. announcement_reads
    // 主キー (announcement_id, user_id) があるため、announcement_id 単独のインデックスは不要
    try {
        console.log('Dropping index: announcement_reads_announcement_id_idx...');
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "announcement_reads_announcement_id_idx";`);
        console.log('  -> OK');
    } catch (e) {
        console.error(`  -> Failed: ${e}`);
    }

    // 2. user_roles
    // 複合主キー (user_id, tenant_id, role_id) があるため、user_id 始まりのインデックスは不要
    // ただし、tenant_id, role_id 単独のインデックスは検索パターンによっては必要なので残す判断もありうるが、
    // 警告が出ているということは完全に包含されている可能性が高い。
    // ここでは、Prismaがデフォルトで作成する可能性のある名前をトライする。

    // もし "user_roles_user_id_tenant_id_role_id_key" という名前のインデックス（旧ユニーク制約の実体）が残っているなら削除
    try {
        console.log('Dropping potential old unique index: user_roles_user_id_tenant_id_role_id_key...');
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "user_roles_user_id_tenant_id_role_id_key";`);
        console.log('  -> OK');
    } catch (e) {
        console.error(`  -> Failed: ${e}`);
    }

    console.log('=== 重複インデックス削除 完了 ===');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
