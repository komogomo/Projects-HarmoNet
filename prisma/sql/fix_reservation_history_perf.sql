-- reservation_history テーブルのRLSポリシー最適化
-- 警告: "auth.jwt() or current_setting() is re-evaluated for each row" への対応
-- 対策: (select ...) でラップして定数として扱わせる

-- 既存ポリシーの削除
DROP POLICY IF EXISTS "reservation_history_select" ON "reservation_history";
DROP POLICY IF EXISTS "reservation_history_insert" ON "reservation_history";
DROP POLICY IF EXISTS "reservation_history_update" ON "reservation_history";
DROP POLICY IF EXISTS "reservation_history_delete" ON "reservation_history";
DROP POLICY IF EXISTS "reservation_history_service_role" ON "reservation_history";

-- RLSの有効化（念のため）
ALTER TABLE "reservation_history" ENABLE ROW LEVEL SECURITY;

-- 1. SELECT ポリシー
CREATE POLICY "reservation_history_select"
ON "reservation_history"
FOR SELECT
TO authenticated
USING (
  tenant_id = (select auth.jwt() ->> 'tenant_id')
);

-- 2. INSERT ポリシー
CREATE POLICY "reservation_history_insert"
ON "reservation_history"
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = (select auth.jwt() ->> 'tenant_id')
);

-- 3. UPDATE ポリシー
CREATE POLICY "reservation_history_update"
ON "reservation_history"
FOR UPDATE
TO authenticated
USING (
  tenant_id = (select auth.jwt() ->> 'tenant_id')
)
WITH CHECK (
  tenant_id = (select auth.jwt() ->> 'tenant_id')
);

-- 4. DELETE ポリシー
CREATE POLICY "reservation_history_delete"
ON "reservation_history"
FOR DELETE
TO authenticated
USING (
  tenant_id = (select auth.jwt() ->> 'tenant_id')
);

-- 5. Service Role ポリシー（全権限）
CREATE POLICY "reservation_history_service_role"
ON "reservation_history"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
