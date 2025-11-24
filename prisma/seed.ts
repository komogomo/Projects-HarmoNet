import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 HarmoNet Phase9 全部入りSeed開始')

  // 既存の harmonet-demo テナントコードを SEC001 にリネーム（初期に投入したデータとの互換用）
  await prisma.tenants.updateMany({
    where: { tenant_code: 'harmonet-demo' },
    data: { tenant_code: 'SEC001' },
  })

  // === 1. テナント作成 ===
  const tenant = await prisma.tenants.upsert({
    where: { tenant_code: 'SEC001' },
    update: {},
    create: {
      tenant_code: 'SEC001',
      tenant_name: 'HarmoNet Demo',
      timezone: 'Asia/Tokyo',
      is_active: true,
    },
  })
  console.log('✅ tenant: SEC001 作成完了')

  // === 2. ロール定義 ===
  const systemAdminRole = await prisma.roles.upsert({
    where: { role_key: 'system_admin' },
    update: {},
    create: {
      role_key: 'system_admin',
      name: 'システム管理者',
      scope: 'system_admin',
    },
  })

  const tenantAdminRole = await prisma.roles.upsert({
    where: { role_key: 'tenant_admin' },
    update: {},
    create: {
      role_key: 'tenant_admin',
      name: 'テナント管理者（管理組合）',
      scope: 'tenant_admin',
    },
  })

  const generalUserRole = await prisma.roles.upsert({
    where: { role_key: 'general_user' },
    update: {},
    create: {
      role_key: 'general_user',
      name: '一般利用者（住民）',
      scope: 'general_user',
    },
  })

  console.log('✅ roles: system_admin / tenant_admin / general_user 登録完了')

  // === 3. システム管理者ユーザー作成（TKD） ===
  const sysAdmin = await prisma.users.upsert({
    where: { email: 'ttakeda43+sysadmin@gmail.com' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'ttakeda43+sysadmin@gmail.com',
      display_name: 'システム管理者（竹田）',
      language: 'ja',
    },
  })

  // システム管理者ロール付与
  await prisma.user_roles.deleteMany({
    where: {
      user_id: sysAdmin.id,
      tenant_id: tenant.id,
      role_id: systemAdminRole.id,
    },
  })

  await prisma.user_roles.create({
    data: {
      user_id: sysAdmin.id,
      tenant_id: tenant.id,
      role_id: systemAdminRole.id,
    },
  })

  console.log('✅ ttakeda43+sysadmin@gmail.com 登録 + system_adminロール付与完了')

  // === 4. テナント管理者ユーザー作成（管理組合） ===
  const tenantAdmin = await prisma.users.upsert({
    where: { email: 'ttakeda43+admin@gmail.com' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'ttakeda43+admin@gmail.com',
      display_name: '管理組合理事長',
      language: 'ja',
    },
  })

  // テナント管理者ロール付与
  await prisma.user_roles.deleteMany({
    where: {
      user_id: tenantAdmin.id,
      tenant_id: tenant.id,
      role_id: tenantAdminRole.id,
    },
  })

  await prisma.user_roles.create({
    data: {
      user_id: tenantAdmin.id,
      tenant_id: tenant.id,
      role_id: tenantAdminRole.id,
    },
  })

  console.log('✅ ttakeda43+admin@gmail.com 登録 + tenant_adminロール付与完了')

  // === 4.5. 認証テスト用ユーザー作成（WS-A03: ttakeda43@gmail.com） ===
  const loginTestUser = await prisma.users.upsert({
    where: { email: 'ttakeda43@gmail.com' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'ttakeda43@gmail.com',
      display_name: '認証テストユーザー（竹田）',
      language: 'ja',
    },
  })

  // 認証テストユーザーに tenant_admin ロールを付与
  await prisma.user_roles.deleteMany({
    where: {
      user_id: loginTestUser.id,
      tenant_id: tenant.id,
      role_id: tenantAdminRole.id,
    },
  })

  await prisma.user_roles.create({
    data: {
      user_id: loginTestUser.id,
      tenant_id: tenant.id,
      role_id: tenantAdminRole.id,
    },
  })

  console.log('✅ ttakeda43@gmail.com 登録 + tenant_adminロール付与完了')

  // === 5. 一般利用者ユーザー作成（住民） ===
  const user1 = await prisma.users.upsert({
    where: { email: 'ttakeda43+user1@gmail.com' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'ttakeda43+user1@gmail.com',
      display_name: '山田太郎',
      language: 'ja',
    },
  })

  // 一般利用者ロール付与
  await prisma.user_roles.deleteMany({
    where: {
      user_id: user1.id,
      tenant_id: tenant.id,
      role_id: generalUserRole.id,
    },
  })

  await prisma.user_roles.create({
    data: {
      user_id: user1.id,
      tenant_id: tenant.id,
      role_id: generalUserRole.id,
    },
  })

  console.log('✅ ttakeda43+user1@gmail.com 登録 + general_userロール付与完了')

  // === 5.1. シンプルなテスト用アカウント（admin@gmail.com, user01@gmail.com） ===
  const simpleAdmin = await prisma.users.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'admin@gmail.com',
      display_name: '管理組合アカウント',
      language: 'ja',
    },
  })

  // admin@gmail.com に tenant_admin ロールを付与
  await prisma.user_roles.deleteMany({
    where: {
      user_id: simpleAdmin.id,
      tenant_id: tenant.id,
      role_id: tenantAdminRole.id,
    },
  })

  await prisma.user_roles.create({
    data: {
      user_id: simpleAdmin.id,
      tenant_id: tenant.id,
      role_id: tenantAdminRole.id,
    },
  })

  console.log('✅ admin@gmail.com 登録 + tenant_adminロール付与完了')

  const simpleUser01 = await prisma.users.upsert({
    where: { email: 'user01@gmail.com' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'user01@gmail.com',
      display_name: '一般利用者 user01',
      language: 'ja',
    },
  })

  // user01@gmail.com に general_user ロールを付与
  await prisma.user_roles.deleteMany({
    where: {
      user_id: simpleUser01.id,
      tenant_id: tenant.id,
      role_id: generalUserRole.id,
    },
  })

  await prisma.user_roles.create({
    data: {
      user_id: simpleUser01.id,
      tenant_id: tenant.id,
      role_id: generalUserRole.id,
    },
  })

  console.log('✅ user01@gmail.com 登録 + general_userロール付与完了')

  // === 6. user_tenants登録（ユーザーとテナントの紐付け） ===
  await prisma.user_tenants.upsert({
    where: {
      user_id_tenant_id: {
        user_id: sysAdmin.id,
        tenant_id: tenant.id,
      },
    },
    update: {},
    create: {
      user_id: sysAdmin.id,
      tenant_id: tenant.id,
    },
  })

  await prisma.user_tenants.upsert({
    where: {
      user_id_tenant_id: {
        user_id: loginTestUser.id,
        tenant_id: tenant.id,
      },
    },
    update: {},
    create: {
      user_id: loginTestUser.id,
      tenant_id: tenant.id,
    },
  })

  await prisma.user_tenants.upsert({
    where: {
      user_id_tenant_id: {
        user_id: tenantAdmin.id,
        tenant_id: tenant.id,
      },
    },
    update: {},
    create: {
      user_id: tenantAdmin.id,
      tenant_id: tenant.id,
    },
  })

  await prisma.user_tenants.upsert({
    where: {
      user_id_tenant_id: {
        user_id: user1.id,
        tenant_id: tenant.id,
      },
    },
    update: {},
    create: {
      user_id: user1.id,
      tenant_id: tenant.id,
    },
  })

  await prisma.user_tenants.upsert({
    where: {
      user_id_tenant_id: {
        user_id: simpleAdmin.id,
        tenant_id: tenant.id,
      },
    },
    update: {},
    create: {
      user_id: simpleAdmin.id,
      tenant_id: tenant.id,
    },
  })

  await prisma.user_tenants.upsert({
    where: {
      user_id_tenant_id: {
        user_id: simpleUser01.id,
        tenant_id: tenant.id,
      },
    },
    update: {},
    create: {
      user_id: simpleUser01.id,
      tenant_id: tenant.id,
    },
  })

  console.log('✅ user_tenants 紐付け完了')

  // === 7. 掲示板カテゴリ ===
  await prisma.board_categories.createMany({
    data: [
      { tenant_id: tenant.id, category_key: 'important', category_name: '重要なお知らせ', display_order: 1 },
      { tenant_id: tenant.id, category_key: 'circular', category_name: '回覧板', display_order: 2 },
      { tenant_id: tenant.id, category_key: 'event', category_name: 'イベント', display_order: 3 },
      { tenant_id: tenant.id, category_key: 'rules', category_name: 'ルール・規約', display_order: 4 },
      { tenant_id: tenant.id, category_key: 'question', category_name: '質問', display_order: 5 },
      { tenant_id: tenant.id, category_key: 'request', category_name: '要望', display_order: 6 },
      { tenant_id: tenant.id, category_key: 'other', category_name: 'その他', display_order: 7 },
    ],
    skipDuplicates: true,
  })
  console.log('✅ 掲示板カテゴリ登録完了')

  // === 8. 施設データ ===
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

  console.log('✅ 施設登録完了')

  // === 9. 施設設定 ===
  await prisma.facility_settings.upsert({
    where: { facility_id: facilityRoom.id },
    update: {},
    create: {
      tenant_id: tenant.id,
      facility_id: facilityRoom.id,
      fee_per_day: 1000,
      fee_unit: 'day',
      max_consecutive_days: 3,
      reservable_until_months: 1,
    },
  })

  await prisma.facility_settings.upsert({
    where: { facility_id: facilityParking.id },
    update: {},
    create: {
      tenant_id: tenant.id,
      facility_id: facilityParking.id,
      fee_per_day: 300,
      fee_unit: 'hour',
      max_consecutive_days: 3,
      reservable_until_months: 1,
    },
  })

  console.log('✅ 施設設定登録完了')

  // === 10. 駐車場区画登録 ===
  const parkingSlots = [
    { slot_key: 'F1', slot_name: '表F1' },
    { slot_key: 'F2', slot_name: '表F2' },
    { slot_key: 'F3', slot_name: '表F3' },
    { slot_key: 'F4', slot_name: '表F4' },
    { slot_key: 'F5', slot_name: '表F5' },
    { slot_key: 'F6', slot_name: '表F6' },
    { slot_key: 'B1', slot_name: '裏B1' },
    { slot_key: 'B2', slot_name: '裏B2' },
    { slot_key: 'B3', slot_name: '裏B3' },
    { slot_key: 'B4', slot_name: '裏B4' },
    { slot_key: 'B5', slot_name: '裏B5' },
    { slot_key: 'B6', slot_name: '裏B6' },
  ]

  for (const slot of parkingSlots) {
    await prisma.facility_slots.upsert({
      where: {
        // 複合ユニーク制約がないので、findFirstで確認してからupsert
        id: (await prisma.facility_slots.findFirst({
          where: {
            tenant_id: tenant.id,
            facility_id: facilityParking.id,
            slot_key: slot.slot_key,
          },
        }))?.id || 'dummy-id-' + slot.slot_key,
      },
      update: {},
      create: {
        tenant_id: tenant.id,
        facility_id: facilityParking.id,
        slot_key: slot.slot_key,
        slot_name: slot.slot_name,
        status: 'active',
      },
    })
  }

  console.log('🌱 全部入りSeed投入完了')
}

// === エントリーポイント ===
main()
  .catch((e) => {
    console.error('❌ Seed投入中にエラーが発生しました:', e)
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
