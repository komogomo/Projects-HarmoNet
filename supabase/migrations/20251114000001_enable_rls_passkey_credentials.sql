-- =============================================
-- 20251114000001_enable_rls_passkey_credentials.sql
-- Passkey 認証情報テーブル RLS ポリシー追加（HarmoNet）
-- HarmoNet Supabase Migration Rule 準拠
-- Modified: 2025-11-18 (Fix performance warnings and multiple permissive policies)
-- =============================================

-- RLS 有効化
ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;

-- ユーザー本人のみ参照可能 (AND テナント分離)
CREATE POLICY "passkey_credentials_select_own"
ON passkey_credentials
FOR SELECT
USING (
  user_id = (select auth.uid())::text
  AND tenant_id = (select current_setting('app.current_tenant_id', true))::text
);

-- ユーザー本人のみ更新可能 (AND テナント分離)
CREATE POLICY "passkey_credentials_update_own"
ON passkey_credentials
FOR UPDATE
USING (
  user_id = (select auth.uid())::text
  AND tenant_id = (select current_setting('app.current_tenant_id', true))::text
);

-- ユーザー本人のみ削除可能 (AND テナント分離)
CREATE POLICY "passkey_credentials_delete_own"
ON passkey_credentials
FOR DELETE
USING (
  user_id = (select auth.uid())::text
  AND tenant_id = (select current_setting('app.current_tenant_id', true))::text
);

-- 認証済みユーザーのみ登録可能 (AND テナント分離)
CREATE POLICY "passkey_credentials_insert_authenticated"
ON passkey_credentials
FOR INSERT
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND user_id = (select auth.uid())::text
  AND tenant_id = (select current_setting('app.current_tenant_id', true))::text
);