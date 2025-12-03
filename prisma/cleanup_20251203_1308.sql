BEGIN;

-- 1. 今回の seed で作られた重複施設（SEC001 テナント, 2025-12-03 13:08:00〜13:08:01）
CREATE TEMP TABLE dup_facilities AS
SELECT f.id
FROM public.facilities f
JOIN public.tenants t ON t.id = f.tenant_id
WHERE t.tenant_code = 'SEC001'
  AND f.created_at BETWEEN '2025-12-03 13:08:00'::timestamp
                       AND '2025-12-03 13:08:01'::timestamp;

-- 念のため事前確認したければ:
-- SELECT * FROM public.facilities WHERE id IN (SELECT id FROM dup_facilities);

-- 2. 施設にぶら下がるレコードを子 -> 親の順で削除
DELETE FROM public.facility_slots
 WHERE facility_id IN (SELECT id FROM dup_facilities);

DELETE FROM public.facility_reservations
 WHERE facility_id IN (SELECT id FROM dup_facilities);

DELETE FROM public.facility_blocked_ranges
 WHERE facility_id IN (SELECT id FROM dup_facilities);

DELETE FROM public.facility_settings
 WHERE facility_id IN (SELECT id FROM dup_facilities);

DELETE FROM public.facilities
 WHERE id IN (SELECT id FROM dup_facilities);

-- 3. 13:08:00 台に入った user_roles のゴミ行を削除
DELETE FROM public.user_roles ur
USING public.tenants t
WHERE ur.tenant_id = t.id
  AND t.tenant_code = 'SEC001'
  AND ur.assigned_at BETWEEN '2025-12-03 13:08:00'::timestamp
                         AND '2025-12-03 13:08:01'::timestamp;

COMMIT;
