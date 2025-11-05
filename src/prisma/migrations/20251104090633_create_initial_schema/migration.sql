-- ==========================================
-- HarmoNet Initial Schema Migration
-- Phase 5 - v1.0 / Prisma v1.0準拠
-- Created: 2025-11-04
-- Document ID: HNM-MIG-20251104-001
-- Author: Claude + Tachikoma Design
-- ==========================================

-- ========== SECTION 1: ENUM定義 ==========

CREATE TYPE "Status" AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE "ReactionType" AS ENUM ('like', 'report', 'bookmark');
CREATE TYPE "ApprovalAction" AS ENUM ('approve', 'reconsider');
CREATE TYPE "FacilityFeeUnit" AS ENUM ('day', 'hour');
CREATE TYPE "DecisionType" AS ENUM ('allow', 'mask', 'block');
CREATE TYPE "DecisionSource" AS ENUM ('system', 'human');

-- ========== SECTION 2: テーブル作成 ==========

-- 2.1 Tenant Management
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_code TEXT NOT NULL UNIQUE,
    tenant_name TEXT NOT NULL,
    timezone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status "Status" NOT NULL DEFAULT 'active'
);

CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    config_json JSONB,
    default_language TEXT NOT NULL DEFAULT 'ja',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status "Status" NOT NULL DEFAULT 'active'
);

CREATE TABLE tenant_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    feature_key TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status "Status" NOT NULL DEFAULT 'active'
);

-- 2.2 Users / Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'ja',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status "Status" NOT NULL DEFAULT 'active'
);

CREATE TABLE user_tenants (
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status "Status" NOT NULL DEFAULT 'active',
    PRIMARY KEY (user_id, tenant_id)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, tenant_id, role_id)
);

CREATE TABLE user_profiles (
    user_id UUID NOT NULL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    preferences JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Roles / Permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'tenant',
    permissions_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_inheritances (
    parent_role_id UUID NOT NULL,
    child_role_id UUID NOT NULL,
    PRIMARY KEY (parent_role_id, child_role_id)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key TEXT NOT NULL UNIQUE,
    resource TEXT NOT NULL,
    action TEXT NOT NULL
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    UNIQUE (role_id, permission_id)
);

-- 2.4 Board
CREATE TABLE board_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    category_key TEXT NOT NULL,
    category_name TEXT NOT NULL,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status "Status" NOT NULL DEFAULT 'active'
);

CREATE TABLE board_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    author_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES board_categories(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE board_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    post_id UUID NOT NULL REFERENCES board_posts(id),
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE board_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    post_id UUID NOT NULL REFERENCES board_posts(id),
    user_id UUID NOT NULL,
    reaction_type "ReactionType" NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id, reaction_type)
);

CREATE TABLE board_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    post_id UUID NOT NULL REFERENCES board_posts(id),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE board_approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    post_id UUID NOT NULL REFERENCES board_posts(id),
    approver_id UUID NOT NULL,
    action "ApprovalAction" NOT NULL,
    comment TEXT,
    acted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_mode TEXT NOT NULL DEFAULT 'all',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE announcement_reads (
    announcement_id UUID NOT NULL REFERENCES announcements(id),
    user_id UUID NOT NULL,
    read_at TIMESTAMPTZ NOT NULL,
    UNIQUE (announcement_id, user_id)
);

-- 2.6 Facilities
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    facility_name TEXT NOT NULL,
    facility_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE facility_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    facility_id UUID NOT NULL REFERENCES facilities(id) UNIQUE,
    fee_per_day DECIMAL,
    fee_unit "FacilityFeeUnit" NOT NULL DEFAULT 'day',
    max_consecutive_days INTEGER NOT NULL DEFAULT 3,
    reservable_until_months INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE facility_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    slot_key TEXT NOT NULL,
    slot_name TEXT NOT NULL,
    status "Status" NOT NULL DEFAULT 'active'
);

CREATE TABLE facility_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    slot_id UUID,
    user_id UUID NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 Cache
CREATE TABLE translation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    language TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    UNIQUE (tenant_id, content_type, content_id, language)
);

CREATE TABLE tts_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    language TEXT NOT NULL,
    voice_type TEXT NOT NULL DEFAULT 'default',
    audio_url TEXT NOT NULL,
    duration_sec DECIMAL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, content_type, content_id, language)
);

-- 2.8 Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

CREATE TABLE user_notification_settings (
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    notification_type TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, tenant_id, notification_type)
);

-- 2.9 Audit / Moderation
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    target_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    ai_score DECIMAL,
    flagged_reason TEXT,
    decision "DecisionType" NOT NULL DEFAULT 'allow',
    decided_by "DecisionSource" NOT NULL DEFAULT 'system',
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by TEXT
);

-- ========== SECTION 3: インデックス作成 ==========

-- Tenant
CREATE INDEX idx_tenants_code ON tenants(tenant_code);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- Board
CREATE INDEX idx_board_posts_tenant ON board_posts(tenant_id);
CREATE INDEX idx_board_posts_category ON board_posts(category_id);
CREATE INDEX idx_board_posts_author ON board_posts(author_id);
CREATE INDEX idx_board_posts_created ON board_posts(created_at DESC);
CREATE INDEX idx_board_posts_tags ON board_posts USING GIN(tags);

-- Facilities
CREATE INDEX idx_facility_reservations_facility_date ON facility_reservations(facility_id, start_at);
CREATE INDEX idx_facility_reservations_user ON facility_reservations(user_id);

-- Translation Cache
CREATE INDEX idx_translation_cache_lookup ON translation_cache(tenant_id, content_type, content_id, language);

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Audit
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ========== SECTION 4: コメント追加 ==========

COMMENT ON TABLE tenants IS 'テナントマスタ';
COMMENT ON TABLE users IS 'ユーザーマスタ';
COMMENT ON TABLE board_posts IS '掲示板投稿';
COMMENT ON TABLE facilities IS '施設マスタ';
COMMENT ON TABLE translation_cache IS '翻訳キャッシュ(30日保持)';
COMMENT ON TABLE tts_cache IS 'TTS音声キャッシュ(30日保持)';
COMMENT ON TABLE audit_logs IS '監査ログ(365日保持)';
COMMENT ON TABLE moderation_logs IS 'AIモデレーションログ';

-- ========== SECTION 5: updated_at自動更新トリガー ==========

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 各テーブルにトリガー設定
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_settings_updated_at 
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_features_updated_at 
    BEFORE UPDATE ON tenant_features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_categories_updated_at 
    BEFORE UPDATE ON board_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_posts_updated_at 
    BEFORE UPDATE ON board_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_comments_updated_at 
    BEFORE UPDATE ON board_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at 
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at 
    BEFORE UPDATE ON facilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_settings_updated_at 
    BEFORE UPDATE ON facility_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_reservations_updated_at 
    BEFORE UPDATE ON facility_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Migration Complete
-- Total Tables: 30
-- Total Indexes: 12
-- Total Triggers: 11
-- ==========================================