// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenantCode = 'SEC001'
  const parkingFacilityName = 'ゲスト用駐車場'

  // テナント取得
  const tenant = await prisma.tenants.findUnique({
    where: { tenant_code: tenantCode },
  })
  if (!tenant) {
    console.error('❌ tenant が見つかりません:', tenantCode)
    return
  }

  // 駐車場施設（ゲスト用駐車場）を取得
  const facility = await prisma.facilities.findFirst({
    where: {
      tenant_id: tenant.id,
      facility_type: 'parking',
      facility_name: parkingFacilityName,
    },
  })

  if (!facility) {
    console.error('❌ 駐車場施設が見つかりません:', parkingFacilityName)
    return
  }

  const desiredSlots = [
    { slot_key: '1', slot_name: '①' },
    { slot_key: '2', slot_name: '②' },
    { slot_key: '3', slot_name: '③' },
    { slot_key: '4', slot_name: '④' },
    { slot_key: '5', slot_name: '⑤' },
    { slot_key: '6', slot_name: '⑥' },
    { slot_key: '7', slot_name: '⑦' },
    { slot_key: '8', slot_name: '⑧' },
  ] as const

  for (const s of desiredSlots) {
    const existing = await prisma.facility_slots.findFirst({
      where: {
        tenant_id: tenant.id,
        facility_id: facility.id,
        slot_key: s.slot_key,
      },
    })

    if (existing) {
      await prisma.facility_slots.update({
        where: { id: existing.id },
        data: {
          slot_name: s.slot_name,
          status: 'active',
        },
      })
    } else {
      await prisma.facility_slots.create({
        data: {
          tenant_id: tenant.id,
          facility_id: facility.id,
          slot_key: s.slot_key,
          slot_name: s.slot_name,
          status: 'active',
        },
      })
    }
  }

  console.log('✅ facility_slots を ①〜⑧ で整備しました: facility_id =', facility.id)
}

main()
  .catch((e) => {
    console.error('❌ set_parking_slots 実行中にエラー:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
