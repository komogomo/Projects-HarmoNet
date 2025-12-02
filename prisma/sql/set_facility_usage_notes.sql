-- Set facility usage notes (JA/EN/ZH) for meeting room and guest parking
-- This script updates tenant_settings.config_json for tenants that own
-- facilities with the specified IDs.

WITH target_tenants AS (
  SELECT DISTINCT tenant_id
  FROM public.facilities
  WHERE id IN (
    '439209d7-45ec-42c8-bd91-d5b0304d41a1', -- 集会所（セキュレアステーション）
    'b5ae3b22-aabf-4507-a012-ce1fdf050537'  -- ゲスト駐車場
  )
)
UPDATE public.tenant_settings AS ts
SET config_json = jsonb_set(
  COALESCE(ts.config_json::jsonb, '{}'::jsonb),
  '{facility,usageNotes}',
  COALESCE(ts.config_json::jsonb -> 'facility' -> 'usageNotes', '{}'::jsonb)
    || '{
      "439209d7-45ec-42c8-bd91-d5b0304d41a1": {
        "ja": "・使用時間：原則午前９時より午後７時まで。\n・使用目的：１）本団地の維持管理に関する諸事項の協議等、２）居住者の相互親睦・利便等、３）地域コミュニティの形成等\n・使用料：無償\n・遵守事項：集会所では原則飲酒、喫煙をしないこと。ただし、飲酒については理事長が認めた場合はその限りではない。その他規定は管理規約使用細則を参照。\n・予約方法：貸切での利用に限り、居住者用ホームページ（本サイト）上での予約が必要。",
        "en": "- Hours of use: In principle, from 9:00 a.m. to 7:00 p.m.\n- Purpose of use:\n  1) Discussions and coordination regarding various matters related to the maintenance and management of this complex\n  2) Promoting mutual friendship and convenience among residents\n  3) Forming and fostering the local community, etc.\n- Usage fee: Free of charge.\n- Rules to observe: As a general rule, drinking alcohol and smoking are not allowed in the meeting room. However, this restriction does not apply if drinking has been approved by the chairperson of the management association. For other rules, refer to the Management Rules and Detailed Rules for Use.\n- Reservation method: For exclusive / private use only, a reservation is required via the residents’ website (this site).",
        "zh": "- 使用时间：原则上为上午9点至下午7点。\n- 使用目的：\n  1）就本小区维护管理相关事项进行协商等；\n  2）增进住户之间的相互交流与便利；\n  3）促进社区交流与社区建设等。\n- 使用费用：免费。\n- 遵守事项：原则上禁止在集会所内饮酒和吸烟。但经理事长批准的饮酒不在此限。其他规定请参照《管理规约・使用细则》。\n- 预约方式：仅在包场使用的情况下，需要通过住户主页（本网站）进行预约。"
      },
      "b5ae3b22-aabf-4507-a012-ce1fdf050537": {
        "ja": "・使用料：１００円／回\n・支払方法：使用前に集会所備え付けの集金ボックスに入金\n・最大使用時間：２４時間／回\n・最大使用回数：１０回／月\n・使用方法：集会所備え付けの駐車場管理台帳に使用時間・使用者名等を記入し、集会所内にある「駐車許可証」をフロントガラス等の見やすい部分に提示して使用すること。",
        "en": "- Usage fee: 100 yen per use.\n- Payment method: Before use, deposit the fee into the collection box provided in the meeting room.\n- Maximum duration per use: 24 hours.\n- Maximum number of uses: 10 times per month.\n- How to use: Enter the time of use, user’s name, and other required information in the parking management ledger provided in the meeting room, and place the “Parking Permit” available in the meeting room in a clearly visible position, such as on the front windshield, while using the parking space.",
        "zh": "- 使用费用：每次100日元。\n- 支付方式：使用前将费用投入集会所内设置的收款箱。\n- 最长使用时间：每次24小时。\n- 最多使用次数：每月10次。\n- 使用方法：在集会所内放置的《停车场管理台账》中填写使用时间、使用者姓名等信息，并将集会所内备有的「停车许可证」放置在挡风玻璃等容易看见的位置后使用车位。"
      }
    }'::jsonb,
  true
)
WHERE ts.tenant_id IN (SELECT tenant_id FROM target_tenants);
