-- sys-admin: upsert missing static translation defaults and propagate to all tenants
-- Purpose:
-- 1) Ensure static_translation_defaults has required keys (UPSERT)
-- 2) Propagate defaults to tenant_static_translations for all tenants (UPSERT)
--
-- Notes:
-- - Missing translations must not be masked in UI; this script makes data complete.
-- - This script assumes both tables use TEXT id with UUID strings.
-- - Uses gen_random_uuid() (pgcrypto) which is available in Supabase.

WITH desired AS (
  SELECT * FROM (VALUES
    -- sys_admin_login
    ('sys_admin_login', 'sys_admin_login', 'page_title', 'システム管理者ログイン', 'System Administrator Login', '系统管理员登录'),
    ('sys_admin_login', 'sys_admin_login', 'page_description', 'システム管理者専用のテナント管理コンソールへのログイン画面です。', 'Login page for the system administrator tenant console.', '系统管理员专用的租户管理控制台登录页面。'),
    ('sys_admin_login', 'sys_admin_login', 'no_permission_message', 'このアカウントにはシステム管理者権限がありません。', 'This account does not have system administrator privileges.', '此账号没有系统管理员权限。'),

    -- sys_admin_tenants (page client uses these keys)
    ('sys_admin_tenants', 'sys_admin_tenants', 'tenants_load_error_title', 'テナント一覧の取得に失敗しました。', 'Failed to load tenant list.', '获取租户列表失败。'),
    ('sys_admin_tenants', 'sys_admin_tenants', 'tenants_load_error_description', '時間をおいて再度お試しください。', 'Please try again later.', '请稍后重试。')
  ) AS v(screen_key, screen_id, message_key, text_ja, text_en, text_zh)
),
upsert_defaults AS (
  INSERT INTO public.static_translation_defaults (
    id,
    screen_id,
    screen_key,
    message_key,
    text_ja,
    text_en,
    text_zh,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid()::text AS id,
    d.screen_id,
    d.screen_key,
    d.message_key,
    d.text_ja,
    d.text_en,
    d.text_zh,
    now(),
    now()
  FROM desired d
  ON CONFLICT (screen_key, message_key)
  DO UPDATE SET
    screen_id = EXCLUDED.screen_id,
    text_ja = EXCLUDED.text_ja,
    text_en = EXCLUDED.text_en,
    text_zh = EXCLUDED.text_zh,
    updated_at = now()
  RETURNING screen_key, screen_id, message_key, text_ja, text_en, text_zh
),
source_defaults AS (
  SELECT
    d.screen_id,
    d.screen_key,
    d.message_key,
    d.text_ja,
    d.text_en,
    d.text_zh
  FROM public.static_translation_defaults d
  WHERE d.screen_key IN ('sys_admin_login', 'sys_admin_tenants')
),
all_tenants AS (
  SELECT id AS tenant_id
  FROM public.tenants
),
rows_to_propagate AS (
  SELECT
    t.tenant_id,
    d.screen_id,
    d.screen_key,
    d.message_key,
    d.text_ja,
    d.text_en,
    d.text_zh
  FROM all_tenants t
  CROSS JOIN source_defaults d
)
INSERT INTO public.tenant_static_translations (
  id,
  tenant_id,
  screen_id,
  screen_key,
  message_key,
  text_ja,
  text_en,
  text_zh,
  created_at,
  updated_at,
  status
)
SELECT
  gen_random_uuid()::text AS id,
  r.tenant_id,
  r.screen_id,
  r.screen_key,
  r.message_key,
  r.text_ja,
  r.text_en,
  r.text_zh,
  now(),
  now(),
  'active'
FROM rows_to_propagate r
ON CONFLICT (tenant_id, screen_key, message_key)
DO UPDATE SET
  screen_id = EXCLUDED.screen_id,
  text_ja = EXCLUDED.text_ja,
  text_en = EXCLUDED.text_en,
  text_zh = EXCLUDED.text_zh,
  updated_at = now(),
  status = EXCLUDED.status;

-- Verification queries (manual run):
-- select * from public.static_translation_defaults where screen_key in ('sys_admin_login','sys_admin_tenants') order by screen_key, message_key;
-- select tenant_id, screen_key, message_key, text_ja from public.tenant_static_translations where screen_key in ('sys_admin_login','sys_admin_tenants') order by tenant_id, screen_key, message_key;
