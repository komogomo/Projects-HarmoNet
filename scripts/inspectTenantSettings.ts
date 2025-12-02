import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const facilityIds = [
    '439209d7-45ec-42c8-bd91-d5b0304d41a1', // 集会所
    'b5ae3b22-aabf-4507-a012-ce1fdf050537', // ゲスト駐車場
  ];

  const facilities = await prisma.facilities.findMany({
    where: { id: { in: facilityIds } },
    select: { id: true, tenant_id: true, facility_name: true, facility_type: true },
  });

  console.log('facilities =', JSON.stringify(facilities, null, 2));

  const tenantIds = Array.from(new Set(facilities.map((f) => f.tenant_id)));
  if (tenantIds.length === 0) {
    console.log('No facilities found for the specified IDs.');
    return;
  }

  const settings = await prisma.tenant_settings.findMany({
    where: { tenant_id: { in: tenantIds } },
    select: { tenant_id: true, config_json: true },
  });

  console.log('tenant_settings =', JSON.stringify(settings, null, 2));
}

main()
  .catch((e) => {
    console.error('inspectTenantSettings error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
