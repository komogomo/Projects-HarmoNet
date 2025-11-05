-- ==========================================
-- HarmoNet Migration Script
-- Add RLS policy for role_inheritances (global read)
-- Document ID: HNM-MIG-20251104-004
-- Created: 2025-11-04
-- Author: Tachikoma (Architect / PMO)
-- Reviewed by: Gemini (Audit AI), Claude (Design)
-- ==========================================

-- 冪等化: RLS有効化（既に有効でも安全）
ALTER TABLE role_inheritances ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーがあれば削除（冪等性確保）
DROP POLICY IF EXISTS role_inheritances_select ON role_inheritances;

-- 追加: 全ユーザー参照可（非機密メタデータのみ）
CREATE POLICY role_inheritances_select
ON role_inheritances FOR SELECT
USING (true);

-- ==========================================
-- Rationale:
-- ・roles / permissions / role_permissions と同方針（global read）
-- ・アプリの権限継承解決で高頻度参照。service_role不要化
-- ・テナント分離は業務データ側RLSで担保
-- ==========================================

-- Created: 2025-11-04
-- Last Updated: 2025-11-04
-- Version: 1.0
-- Document ID: HNM-MIG-20251104-004