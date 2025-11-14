-- =============================================
-- 20251114000001_enable_rls_passkey_credentials.sql
-- Passkey 認証情報テーブル RLS ポリシー追加（HarmoNet）
-- HarmoNet Supabase Migration Rule 準拠
-- =============================================

-- RLS 有効化
ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;

-- テナント分離（HarmoNet 全テーブル共通ポリシー）
CREATE POLICY "passkey_credentials_tenant_isolation"
ON passkey_credentials
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

-- ユーザー本人のみ参照可能
CREATE POLICY "passkey_credentials_select_own"
ON passkey_credentials
FOR SELECT
USING (user_id = auth.uid()::text);

-- ユーザー本人のみ更新可能
CREATE POLICY "passkey_credentials_update_own"
ON passkey_credentials
FOR UPDATE
USING (user_id = auth.uid()::text);

-- ユーザー本人のみ削除可能
CREATE POLICY "passkey_credentials_delete_own"
ON passkey_credentials
FOR DELETE
USING (user_id = auth.uid()::text);

-- 認証済みユーザーのみ登録可能（かつ user_id が自分であること）
CREATE POLICY "passkey_credentials_insert_authenticated"
ON passkey_credentials
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);