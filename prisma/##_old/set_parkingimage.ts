// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  const tenantId = 'ab3d5d5f-027b-4108-b6aa-2a31941d88eb'
  const parkingFacilityName = ''

  // テナント取得
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
  })
  if (!tenant) {
    console.error('❌ tenant が見つかりません:', tenantId)
    return
  }

  // このテナントの駐車場施設を取得
  if (parkingFacilityName && parkingFacilityName.trim().length > 0) {
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

    // プロジェクト直下の public/images/facility/ParkingLayout.png を読み込む
    const projectRoot = process.cwd()
    const parkingImagePath = path.join(
      projectRoot,
      'public',
      'images',
      'facility',
      'ParkingLayout.png',
    )

    const buffer = await fs.promises.readFile(parkingImagePath)

    await prisma.facilities.update({
      where: { id: facility.id },
      data: {
        // Bytes 型にバイナリをそのまま格納
        parkingimage: buffer as any,
      },
    })

    console.log('✅ parkingimage を更新しました: facility_id =', facility.id)
    return
  }

  const facilities = await prisma.facilities.findMany({
    where: {
      tenant_id: tenant.id,
      facility_type: 'parking',
    },
    select: {
      id: true,
      facility_name: true,
    },
    orderBy: {
      facility_name: 'asc',
    },
  })

  if (!facilities || facilities.length === 0) {
    console.error('❌ 駐車場施設が見つかりません: tenant_id =', tenant.id)
    return
  }

  if (facilities.length !== 1) {
    console.error('❌ 駐車場施設が複数あります。parkingFacilityName を指定してください。')
    for (const f of facilities) {
      console.error(' - facility_id =', f.id, 'facility_name =', f.facility_name)
    }
    return
  }

  const facility = facilities[0]

  // プロジェクト直下の public/images/facility/ParkingLayout.png を読み込む
  const projectRoot = process.cwd()
  const parkingImagePath = path.join(
    projectRoot,
    'public',
    'images',
    'facility',
    'ParkingLayout.png',
  )

  const buffer = await fs.promises.readFile(parkingImagePath)

  await prisma.facilities.update({
    where: { id: facility.id },
    data: {
      // Bytes 型にバイナリをそのまま格納
      parkingimage: buffer as any,
    },
  })

  console.log('✅ parkingimage を更新しました: facility_id =', facility.id)
}

main()
  .catch((e) => {
    console.error('❌ set_parkingimage 実行中にエラー:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
