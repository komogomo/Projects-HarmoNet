-- ============================================
-- RLS Policies for tenant_shortcut_menu
-- Created: 2025-11-20
-- Standard: RLS_Policy_Standard_v1.0.md
-- ============================================

-- Enable RLS
ALTER TABLE tenant_shortcut_menu ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SELECT Policy
-- ============================================
CREATE POLICY "tenant_shortcut_menu_select_authenticated"
ON tenant_shortcut_menu
FOR SELECT
TO authenticated
USING (
  (select auth.jwt()) ->> 'tenant_id' = tenant_id
);

-- ============================================
-- INSERT Policy
-- ============================================
CREATE POLICY "tenant_shortcut_menu_insert_authenticated"
ON tenant_shortcut_menu
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.jwt()) ->> 'tenant_id' = tenant_id
);

-- ============================================
-- UPDATE Policy
-- ============================================
CREATE POLICY "tenant_shortcut_menu_update_authenticated"
ON tenant_shortcut_menu
FOR UPDATE
TO authenticated
USING (
  (select auth.jwt()) ->> 'tenant_id' = tenant_id
)
WITH CHECK (
  (select auth.jwt()) ->> 'tenant_id' = tenant_id
);

-- ============================================
-- DELETE Policy
-- ============================================
CREATE POLICY "tenant_shortcut_menu_delete_authenticated"
ON tenant_shortcut_menu
FOR DELETE
TO authenticated
USING (
  (select auth.jwt()) ->> 'tenant_id' = tenant_id
);
