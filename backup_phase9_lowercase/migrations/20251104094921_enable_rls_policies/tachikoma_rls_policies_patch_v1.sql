-- ==========================================
-- HarmoNet RLS Policies - Missing Patch v1
-- Phase 9 Differential Recovery
-- Author: Tachikoma
-- Date: 2025-11-06
-- ==========================================

-- roles
CREATE POLICY roles_insert ON roles FOR INSERT WITH CHECK (true);
CREATE POLICY roles_update ON roles FOR UPDATE USING (true);
CREATE POLICY roles_delete ON roles FOR DELETE USING (true);

-- role_permissions
CREATE POLICY role_permissions_insert ON role_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY role_permissions_update ON role_permissions FOR UPDATE USING (true);
CREATE POLICY role_permissions_delete ON role_permissions FOR DELETE USING (true);

-- permissions
CREATE POLICY permissions_insert ON permissions FOR INSERT WITH CHECK (true);
CREATE POLICY permissions_update ON permissions FOR UPDATE USING (true);
CREATE POLICY permissions_delete ON permissions FOR DELETE USING (true);

-- role_inheritances
CREATE POLICY role_inheritances_insert ON role_inheritances FOR INSERT WITH CHECK (true);
CREATE POLICY role_inheritances_update ON role_inheritances FOR UPDATE USING (true);
CREATE POLICY role_inheritances_delete ON role_inheritances FOR DELETE USING (true);

-- tenant_features
CREATE POLICY tenant_features_insert ON tenant_features FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY tenant_features_update ON tenant_features FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY tenant_features_delete ON tenant_features FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- tenant_settings
CREATE POLICY tenant_settings_insert ON tenant_settings FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY tenant_settings_update ON tenant_settings FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY tenant_settings_delete ON tenant_settings FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- tenants
CREATE POLICY tenant_insert ON tenants FOR INSERT WITH CHECK (id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY tenant_update ON tenants FOR UPDATE USING (id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY tenant_delete ON tenants FOR DELETE USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ==========================================
-- End of Patch v1
-- ==========================================
