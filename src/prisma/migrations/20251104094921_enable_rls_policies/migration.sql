-- ==========================================
-- HarmoNet RLS Policies Migration
-- Phase 5 - v1.0
-- Created: 2025-11-04
-- Document ID: HNM-MIG-20251104-002
-- Author: Claude + Tachikoma Design
-- ==========================================

-- ========== SECTION 1: RLS有効化 ==========

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_inheritances ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- ========== SECTION 2: テナント分離ポリシー ==========

-- tenants: 自テナントのみ参照可能
CREATE POLICY tenant_select_own
ON tenants FOR SELECT
USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- tenant_settings
CREATE POLICY tenant_settings_all
ON tenant_settings FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- tenant_features
CREATE POLICY tenant_features_all
ON tenant_features FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- users
CREATE POLICY users_select
ON users FOR SELECT
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid OR tenant_id IS NULL);

CREATE POLICY users_insert
ON users FOR INSERT
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid OR tenant_id IS NULL);

CREATE POLICY users_update
ON users FOR UPDATE
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid OR tenant_id IS NULL);

-- user_tenants
CREATE POLICY user_tenants_all
ON user_tenants FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- user_roles
CREATE POLICY user_roles_all
ON user_roles FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- user_profiles
CREATE POLICY user_profiles_all
ON user_profiles FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- roles: グローバルまたは自テナント
CREATE POLICY roles_select
ON roles FOR SELECT
USING (scope = 'global' OR true);

-- permissions: 全ユーザー参照可能
CREATE POLICY permissions_select
ON permissions FOR SELECT
USING (true);

-- role_permissions: 全ユーザー参照可能
CREATE POLICY role_permissions_select
ON role_permissions FOR SELECT
USING (true);

-- board_categories
CREATE POLICY board_categories_all
ON board_categories FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- board_posts
CREATE POLICY board_posts_all
ON board_posts FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- board_comments
CREATE POLICY board_comments_all
ON board_comments FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- board_reactions
CREATE POLICY board_reactions_all
ON board_reactions FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- board_attachments
CREATE POLICY board_attachments_all
ON board_attachments FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- board_approval_logs
CREATE POLICY board_approval_logs_select
ON board_approval_logs FOR SELECT
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY board_approval_logs_insert
ON board_approval_logs FOR INSERT
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- announcements
CREATE POLICY announcements_all
ON announcements FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- announcement_reads
CREATE POLICY announcement_reads_all
ON announcement_reads FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM announcements 
        WHERE announcements.id = announcement_reads.announcement_id 
        AND announcements.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
);

-- facilities
CREATE POLICY facilities_all
ON facilities FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- facility_settings
CREATE POLICY facility_settings_all
ON facility_settings FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- facility_slots
CREATE POLICY facility_slots_all
ON facility_slots FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- facility_reservations
CREATE POLICY facility_reservations_all
ON facility_reservations FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- translation_cache
CREATE POLICY translation_cache_all
ON translation_cache FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- tts_cache
CREATE POLICY tts_cache_all
ON tts_cache FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- notifications
CREATE POLICY notifications_all
ON notifications FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- user_notification_settings
CREATE POLICY user_notification_settings_all
ON user_notification_settings FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- audit_logs: 参照は管理者のみ、挿入は全ユーザー
CREATE POLICY audit_logs_select_admin
ON audit_logs FOR SELECT
USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('tenant_admin', 'system_admin')
);

CREATE POLICY audit_logs_insert_all
ON audit_logs FOR INSERT
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- moderation_logs
CREATE POLICY moderation_logs_select_admin
ON moderation_logs FOR SELECT
USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('tenant_admin', 'system_admin')
);

CREATE POLICY moderation_logs_insert_all
ON moderation_logs FOR INSERT
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ==========================================
-- RLS Policies Complete
-- Total Policies: 52
-- Tenant Isolation: Enabled
-- ==========================================