// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

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

  // このテナントの駐車場施設（ゲスト用駐車場）を取得
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
}

main()
  .catch((e) => {
    console.error('❌ set_parkingimage 実行中にエラー:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
