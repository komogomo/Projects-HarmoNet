-- ==========================================
-- HarmoNet Phase9.7 Auth Extension
-- Enable RLS for invitations table
-- Created: 2025-11-07
-- Modified: 2025-11-18 (Performance Optimization: auth.jwt() -> (select auth.jwt()))
-- Purpose: 招待管理テーブルのRLSポリシー設定
-- ==========================================

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT (同一テナントのみ)
CREATE POLICY invitations_select ON invitations
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- Policy: INSERT (同一テナントのみ)
CREATE POLICY invitations_insert ON invitations
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- Policy: UPDATE (同一テナントのみ)
CREATE POLICY invitations_update ON invitations
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));