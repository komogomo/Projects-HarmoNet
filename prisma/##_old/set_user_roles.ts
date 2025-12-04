// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenantCode = 'SEC001'

  const tenant = await prisma.tenants.findUnique({ where: { tenant_code: tenantCode } })
  if (!tenant) {
    console.error('❌ tenant が見つかりません:', tenantCode)
    return
  }

  // 必要なロールを取得
  const systemAdminRole = await prisma.roles.findUnique({ where: { role_key: 'system_admin' } })
  const tenantAdminRole = await prisma.roles.findUnique({ where: { role_key: 'tenant_admin' } })
  const generalUserRole = await prisma.roles.findUnique({ where: { role_key: 'general_user' } })

  if (!systemAdminRole || !tenantAdminRole || !generalUserRole) {
    console.error('❌ 必要なロール(system_admin / tenant_admin / general_user)のいずれかが存在しません')
    return
  }

  // 想定ユーザーとロールの対応
  const mappings = [
    {
      email: 'ttakeda43+sysadmin@gmail.com',
      roleId: systemAdminRole.id,
      label: 'sysadmin',
    },
    {
      email: 'ttakeda43+admin@gmail.com',
      roleId: tenantAdminRole.id,
      label: 'tenant admin (管理組合)',
    },
    {
      email: 'ttakeda43@gmail.com',
      roleId: tenantAdminRole.id,
      label: 'login test tenant admin',
    },
    {
      email: 'ttakeda43+user1@gmail.com',
      roleId: generalUserRole.id,
      label: 'general user (山田太郎)',
    },
    {
      email: 'admin@gmail.com',
      roleId: tenantAdminRole.id,
      label: 'simple admin',
    },
    {
      email: 'user01@gmail.com',
      roleId: generalUserRole.id,
      label: 'simple user01',
    },
  ] as const

  for (const m of mappings) {
    const user = await prisma.users.findUnique({ where: { email: m.email } })
    if (!user) {
      console.warn(`⚠️ users に存在しないためスキップ: ${m.email} (${m.label})`)
      continue
    }

    await prisma.user_roles.upsert({
      where: {
        user_id_tenant_id_role_id: {
          user_id: user.id,
          tenant_id: tenant.id,
          role_id: m.roleId,
        },
      },
      update: {},
      create: {
        user_id: user.id,
        tenant_id: tenant.id,
        role_id: m.roleId,
      },
    })

    console.log(`✅ user_roles 付与: ${m.email} -> role_id=${m.roleId} (${m.label})`)
  }

  console.log('✅ set_user_roles: 必要なユーザロールの付与処理が完了しました')
}

main()
  .catch((e) => {
    console.error('❌ set_user_roles 実行中にエラー:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
