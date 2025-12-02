import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const facilityIds = [
    '439209d7-45ec-42c8-bd91-d5b0304d41a1', // 集会所（セキュレアステーション）
    'b5ae3b22-aabf-4507-a012-ce1fdf050537', // ゲスト駐車場
  ];

  const facilities = await prisma.facilities.findMany({
    where: { id: { in: facilityIds } },
    select: { id: true, tenant_id: true, facility_name: true, facility_type: true },
  });

  console.log('Target facilities:', JSON.stringify(facilities, null, 2));

  const tenantIds = Array.from(new Set(facilities.map((f) => f.tenant_id)));
  if (tenantIds.length === 0) {
    console.log('No target tenants found for the specified facilities.');
    return;
  }

  for (const tenantId of tenantIds) {
    const setting = await prisma.tenant_settings.findFirst({
      where: { tenant_id: tenantId },
    });

    if (!setting) {
      console.warn('No tenant_settings row found for tenant_id:', tenantId);
      continue;
    }

    const raw = setting.config_json as unknown;
    let config: any = {};

    if (typeof raw === 'string') {
      try {
        config = JSON.parse(raw) as any;
      } catch {
        config = {};
      }
    } else if (typeof raw === 'object' && raw !== null) {
      config = raw as any;
    }

    if (!config.facility || typeof config.facility !== 'object') {
      config.facility = {};
    }

    if (!config.facility.usageNotes || typeof config.facility.usageNotes !== 'object') {
      config.facility.usageNotes = {};
    }

    config.facility.usageNotes['439209d7-45ec-42c8-bd91-d5b0304d41a1'] = {
      ja: '・使用時間：原則午前9時より午後7時まで。\n・使用目的：1) 本団地の維持管理に関する諸事項の協議等、2) 居住者の相互親睦・利便等、3) 地域コミュニティの形成等\n・使用料：無償\n・遵守事項：集会所では原則飲酒、喫煙をしないこと。ただし、飲酒については理事長が認めた場合はその限りではない。その他規定は管理規約使用細則を参照。\n・予約方法：貸切での利用に限り、居住者用ホームページ（本サイト）上での予約が必要。',
      en: '- Hours of use: In principle, from 9:00 a.m. to 7:00 p.m.\n- Purpose of use:\n  1) Discussions and coordination regarding various matters related to the maintenance and management of this complex\n  2) Promoting mutual friendship and convenience among residents\n  3) Forming and fostering the local community, etc.\n- Usage fee: Free of charge.\n- Rules to observe: As a general rule, drinking alcohol and smoking are not allowed in the meeting room. However, this restriction does not apply if drinking has been approved by the chairperson of the management association. For other rules, refer to the Management Rules and Detailed Rules for Use.\n- Reservation method: For exclusive / private use only, a reservation is required via the residents’ website (this site).',
      zh: '- 使用时间：原则上为上午9点至下午7点。\n- 使用目的：\n  1）就本小区维护管理相关事项进行协商等；\n  2）增进住户之间的相互交流与便利；\n  3）促进社区交流与社区建设等。\n- 使用费用：免费。\n- 遵守事项：原则上禁止在集会所内饮酒和吸烟。但经理事长批准的饮酒不在此限。其他规定请参照《管理规约・使用细则》。\n- 预约方式：仅在包场使用的情况下，需要通过住户主页（本网站）进行预约。',
    };

    config.facility.usageNotes['b5ae3b22-aabf-4507-a012-ce1fdf050537'] = {
      ja: '・使用料：100円／回\n・支払方法：使用前に集会所備え付けの集金ボックスに入金\n・最大使用時間：24時間／回\n・最大使用回数：10回／月\n・使用方法：集会所備え付けの駐車場管理台帳に使用時間・使用者名等を記入し、集会所内にある「駐車許可証」をフロントガラス等の見やすい部分に提示して使用すること。',
      en: '- Usage fee: 100 yen per use.\n- Payment method: Before use, deposit the fee into the collection box provided in the meeting room.\n- Maximum duration per use: 24 hours.\n- Maximum number of uses: 10 times per month.\n- How to use: Enter the time of use, user’s name, and other required information in the parking management ledger provided in the meeting room, and place the “Parking Permit” available in the meeting room in a clearly visible position, such as on the front windshield, while using the parking space.',
      zh: '- 使用费用：每次100日元。\n- 支付方式：使用前将费用投入集会所内设置的收款箱。\n- 最长使用时间：每次24小时。\n- 最多使用次数：每月10次。\n- 使用方法：在集会所内放置的《停车场管理台账》中填写使用时间、使用者姓名等信息，并将集会所内备有的「停车许可证」放置在挡风玻璃等容易看见的位置后使用车位。',
    };

    await prisma.tenant_settings.update({
      where: { id: setting.id },
      data: { config_json: config },
    });

    console.log('Updated tenant_settings for tenant_id:', tenantId);
  }
}

main()
  .catch((e) => {
    console.error('setFacilityUsageNotes error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
