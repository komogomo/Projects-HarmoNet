import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 HarmoNet Phase9 全部入りSeed開始')

  // === 1. テナント作成 ===
  const tenant = await prisma.tenants.upsert({
    where: { tenant_code: 'harmonet-demo' },
    update: {},
    create: {
      tenant_code: 'harmonet-demo',
      tenant_name: 'HarmoNet Demo',
      timezone: 'Asia/Tokyo',
      is_active: true,
    },
  })
  console.log('✅ tenant: harmonet-demo 作成完了')

  // === 2. ロール定義 ===
  await prisma.roles.createMany({
    data: [
      { role_key: 'system_admin', name: 'System Administrator', scope: 'global' },
      { role_key: 'tenant_admin', name: 'Tenant Administrator', scope: 'tenant' },
      { role_key: 'general_user', name: 'General User', scope: 'tenant' },
    ],
    skipDuplicates: true,
  })
  console.log('✅ roles: system_admin / tenant_admin / general_user 登録完了')

  // === 3. 管理者ユーザー作成 ===
  const admin = await prisma.users.upsert({
    where: { email: 'admin@harmonet.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'admin@harmonet.local',
      display_name: 'Admin User',
      language: 'ja',
    },
  })

  // tenant_adminロールを取得
  const tenantAdminRole = await prisma.roles.findUnique({
    where: { role_key: 'tenant_admin' },
  })

  // user_rolesに紐付け
  if (tenantAdminRole) {
    await prisma.user_roles.upsert({
      where: {
        user_id_tenant_id_role_id: {
          user_id: admin.id,
          tenant_id: tenant.id,
          role_id: tenantAdminRole.id,
        },
      },
      update: {},
      create: {
        user_id: admin.id,
        tenant_id: tenant.id,
        role_id: tenantAdminRole.id,
      },
    })
  }
  console.log('✅ admin@harmonet.local 登録 + tenant_adminロール付与完了')

  // === 4. 掲示板カテゴリ ===
  await prisma.board_categories.createMany({
    data: [
      { tenant_id: tenant.id, category_key: 'important', category_name: '重要' },
      { tenant_id: tenant.id, category_key: 'question', category_name: '質問' },
      { tenant_id: tenant.id, category_key: 'circular', category_name: '回覧板' },
      { tenant_id: tenant.id, category_key: 'rules', category_name: 'ルール' },
    ],
    skipDuplicates: true,
  })
  console.log('✅ 掲示板カテゴリ登録完了')

   // === 5. 施設データ ===
  let facilityRoom = await prisma.facilities.findFirst({
    where: { facility_name: '集会室', tenant_id: tenant.id },
  })
  if (!facilityRoom) {
    facilityRoom = await prisma.facilities.create({
      data: {
        tenant_id: tenant.id,
        facility_name: '集会室',
        facility_type: 'room',
      },
    })
  }

  let facilityParking = await prisma.facilities.findFirst({
    where: { facility_name: 'ゲスト駐車場', tenant_id: tenant.id },
  })
  if (!facilityParking) {
    facilityParking = await prisma.facilities.create({
      data: {
        tenant_id: tenant.id,
        facility_name: 'ゲスト駐車場',
        facility_type: 'parking',
      },
    })
  }


  // === 6. 施設設定 ===
  await prisma.facility_settings.createMany({
    data: [
      { tenant_id: tenant.id, facility_id: facilityRoom.id, fee_per_day: 1000, fee_unit: 'day' },
      { tenant_id: tenant.id, facility_id: facilityParking.id, fee_per_day: 300, fee_unit: 'hour' },
    ],
    skipDuplicates: true,
  })

  console.log('✅ 施設・設定登録完了')
  console.log('🌱 全部入りSeed投入完了')
}

// === エントリーポイント ===
main()
  .catch((e) => {
    console.error('❌ Seed投入中にエラーが発生しました:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
