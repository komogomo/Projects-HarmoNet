-- ==========================================
-- HarmoNet RLS Policies (Phase9)
-- Multi-Tenant Isolation with Row Level Security
-- Created: 2025-11-07
-- Modified: 2025-11-18 (Performance Optimization: auth.jwt() -> (select auth.jwt()) and fix multiple policies)
-- ==========================================

-- ==========================================
-- 1. Tenant Management (3 tables)
-- ==========================================

-- tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON tenants
  FOR SELECT USING (id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tenants_insert ON tenants
  FOR INSERT WITH CHECK (id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tenants_update ON tenants
  FOR UPDATE USING (id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tenants_delete ON tenants
  FOR DELETE USING (id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- tenant_settings
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_settings_select ON tenant_settings
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tenant_settings_insert ON tenant_settings
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tenant_settings_update ON tenant_settings
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tenant_settings_delete ON tenant_settings
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- tenant_features
ALTER TABLE tenant_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_features_select ON tenant_features
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tenant_features_insert ON tenant_features
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tenant_features_update ON tenant_features
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tenant_features_delete ON tenant_features
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- ==========================================
-- 2. Users / Auth (4 tables)
-- ==========================================

-- users (tenant_id is nullable)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users
  FOR SELECT USING (
    tenant_id::text = ((select auth.jwt()) ->> 'tenant_id') 
    OR tenant_id IS NULL
    OR id = ((select auth.jwt()) ->> 'sub')
  );

CREATE POLICY users_insert ON users
  FOR INSERT WITH CHECK (
    tenant_id::text = ((select auth.jwt()) ->> 'tenant_id') 
    OR tenant_id IS NULL
  );

CREATE POLICY users_update ON users
  FOR UPDATE USING (
    tenant_id::text = ((select auth.jwt()) ->> 'tenant_id') 
    OR tenant_id IS NULL
    OR id = ((select auth.jwt()) ->> 'sub')
  );

-- user_tenants
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_tenants_select ON user_tenants
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_tenants_insert ON user_tenants
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_tenants_update ON user_tenants
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_tenants_delete ON user_tenants
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_select ON user_roles
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_roles_insert ON user_roles
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_roles_update ON user_roles
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_roles_delete ON user_roles
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_select ON user_profiles
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_profiles_insert ON user_profiles
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_profiles_update ON user_profiles
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_profiles_delete ON user_profiles
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- ==========================================
-- 3. Roles / Permissions (4 tables - Global Access)
-- ==========================================

-- roles (全ユーザーが参照可能、管理者のみ編集可能)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_select_all ON roles
  FOR SELECT USING (true);

-- (修正) FOR ALL を INSERT/UPDATE/DELETE に分割
CREATE POLICY "roles_modify_admin_only_insert" ON "public"."roles"
  FOR INSERT
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'system_admin');

CREATE POLICY "roles_modify_admin_only_update" ON "public"."roles"
  FOR UPDATE
  USING (((select auth.jwt()) ->> 'role') = 'system_admin')
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'system_admin');

CREATE POLICY "roles_modify_admin_only_delete" ON "public"."roles"
  FOR DELETE
  USING (((select auth.jwt()) ->> 'role') = 'system_admin');

-- role_inheritances (全ユーザーが参照可能、管理者のみ編集可能)
ALTER TABLE role_inheritances ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_inheritances_select_all ON role_inheritances
  FOR SELECT USING (true);

-- (修正) FOR ALL を INSERT/UPDATE/DELETE に分割
CREATE POLICY "role_inheritances_modify_admin_only_insert" ON "public"."role_inheritances"
  FOR INSERT
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'system_admin');

CREATE POLICY "role_inheritances_modify_admin_only_update" ON "public"."role_inheritances"
  FOR UPDATE
  USING (((select auth.jwt()) ->> 'role') = 'system_admin')
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'system_admin');

CREATE POLICY "role_inheritances_modify_admin_only_delete" ON "public"."role_inheritances"
  FOR DELETE
  USING (((select auth.jwt()) ->> 'role') = 'system_admin');

-- permissions (全ユーザーが参照可能、管理者のみ編集可能)
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY permissions_select_all ON permissions
  FOR SELECT USING (true);

-- (修正) FOR ALL を INSERT/UPDATE/DELETE に分割
CREATE POLICY "permissions_modify_admin_only_insert" ON "public"."permissions"
  FOR INSERT
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'system_admin');

CREATE POLICY "permissions_modify_admin_only_update" ON "public"."permissions"
  FOR UPDATE
  USING (((select auth.jwt()) ->> 'role') = 'system_admin')
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'system_admin');

CREATE POLICY "permissions_modify_admin_only_delete" ON "public"."permissions"
  FOR DELETE
  USING (((select auth.jwt()) ->> 'role') = 'system_admin');

-- role_permissions (全ユーザーが参照可能、管理者のみ編集可能)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_permissions_select_all ON role_permissions
  FOR SELECT USING (true);

-- (修正) FOR ALL を INSERT/UPDATE/DELETE に分割
CREATE POLICY "role_permissions_modify_admin_only_insert" ON "public"."role_permissions"
  FOR INSERT
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'system_admin');

CREATE POLICY "role_permissions_modify_admin_only_update" ON "public"."role_permissions"
  FOR UPDATE
  USING (((select auth.jwt()) ->> 'role') = 'system_admin')
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'system_admin');

CREATE POLICY "role_permissions_modify_admin_only_delete" ON "public"."role_permissions"
  FOR DELETE
  USING (((select auth.jwt()) ->> 'role') = 'system_admin');

-- ==========================================
-- 4. Board / Community (7 tables)
-- ==========================================

-- board_categories
ALTER TABLE board_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY board_categories_select ON board_categories
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_categories_insert ON board_categories
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_categories_update ON board_categories
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_categories_delete ON board_categories
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- board_posts
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY board_posts_select ON board_posts
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_posts_insert ON board_posts
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_posts_update ON board_posts
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_posts_delete ON board_posts
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- board_comments
ALTER TABLE board_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY board_comments_select ON board_comments
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_comments_insert ON board_comments
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_comments_update ON board_comments
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_comments_delete ON board_comments
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- board_reactions
ALTER TABLE board_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY board_reactions_select ON board_reactions
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_reactions_insert ON board_reactions
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_reactions_update ON board_reactions
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_reactions_delete ON board_reactions
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- board_attachments
ALTER TABLE board_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY board_attachments_select ON board_attachments
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_attachments_insert ON board_attachments
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_attachments_update ON board_attachments
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_attachments_delete ON board_attachments
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- board_approval_logs
ALTER TABLE board_approval_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY board_approval_logs_select ON board_approval_logs
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY board_approval_logs_insert ON board_approval_logs
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- ==========================================
-- 5. Announcements (3 tables)
-- ==========================================

-- announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcements_select ON announcements
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY announcements_insert ON announcements
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY announcements_update ON announcements
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY announcements_delete ON announcements
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- announcement_reads (ユーザー自身のレコードのみアクセス可能)
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcement_reads_select ON announcement_reads
  FOR SELECT USING (user_id = ((select auth.jwt()) ->> 'sub'));

CREATE POLICY announcement_reads_insert ON announcement_reads
  FOR INSERT WITH CHECK (user_id = ((select auth.jwt()) ->> 'sub'));

-- announcement_targets (同じテナントのアナウンスメントに紐づくもののみ)
ALTER TABLE announcement_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcement_targets_select ON announcement_targets
  FOR SELECT USING (
    announcement_id IN (
      SELECT id FROM announcements WHERE tenant_id::text = ((select auth.jwt()) ->> 'tenant_id')
    )
  );

-- (修正) FOR ALL を INSERT/UPDATE/DELETE に分割
CREATE POLICY "announcement_targets_modify_admin_insert" ON "public"."announcement_targets"
  FOR INSERT
  WITH CHECK (((select auth.jwt()) ->> 'role') IN ('system_admin', 'tenant_admin'));

CREATE POLICY "announcement_targets_modify_admin_update" ON "public"."announcement_targets"
  FOR UPDATE
  USING (((select auth.jwt()) ->> 'role') IN ('system_admin', 'tenant_admin'))
  WITH CHECK (((select auth.jwt()) ->> 'role') IN ('system_admin', 'tenant_admin'));

CREATE POLICY "announcement_targets_modify_admin_delete" ON "public"."announcement_targets"
  FOR DELETE
  USING (((select auth.jwt()) ->> 'role') IN ('system_admin', 'tenant_admin'));

-- ==========================================
-- 6. Facilities / Reservations (5 tables)
-- ==========================================

-- facilities
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY facilities_select ON facilities
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facilities_insert ON facilities
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facilities_update ON facilities
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facilities_delete ON facilities
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- facility_settings
ALTER TABLE facility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY facility_settings_select ON facility_settings
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_settings_insert ON facility_settings
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_settings_update ON facility_settings
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_settings_delete ON facility_settings
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- facility_slots
ALTER TABLE facility_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY facility_slots_select ON facility_slots
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_slots_insert ON facility_slots
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_slots_update ON facility_slots
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_slots_delete ON facility_slots
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- facility_reservations
ALTER TABLE facility_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY facility_reservations_select ON facility_reservations
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_reservations_insert ON facility_reservations
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_reservations_update ON facility_reservations
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_reservations_delete ON facility_reservations
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- facility_blocked_ranges
ALTER TABLE facility_blocked_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY facility_blocked_ranges_select ON facility_blocked_ranges
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_blocked_ranges_insert ON facility_blocked_ranges
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_blocked_ranges_update ON facility_blocked_ranges
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY facility_blocked_ranges_delete ON facility_blocked_ranges
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- ==========================================
-- 7. Translation / Cache (2 tables)
-- ==========================================

-- translation_cache
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY translation_cache_select ON translation_cache
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY translation_cache_insert ON translation_cache
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY translation_cache_update ON translation_cache
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY translation_cache_delete ON translation_cache
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- tts_cache
ALTER TABLE tts_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY tts_cache_select ON tts_cache
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tts_cache_insert ON tts_cache
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tts_cache_update ON tts_cache
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY tts_cache_delete ON tts_cache
  FOR DELETE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- ==========================================
-- 8. Notifications (2 tables)
-- ==========================================

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- user_notification_settings
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_notification_settings_select ON user_notification_settings
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_notification_settings_insert ON user_notification_settings
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY user_notification_settings_update ON user_notification_settings
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- ==========================================
-- 9. Audit / Moderation (2 tables)
-- ==========================================

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- moderation_logs
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY moderation_logs_select ON moderation_logs
  FOR SELECT USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY moderation_logs_insert ON moderation_logs
  FOR INSERT WITH CHECK (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

CREATE POLICY moderation_logs_update ON moderation_logs
  FOR UPDATE USING (tenant_id::text = ((select auth.jwt()) ->> 'tenant_id'));

-- ==========================================
-- End of RLS Policies
-- Total: 31 tables with RLS enabled
-- ==========================================