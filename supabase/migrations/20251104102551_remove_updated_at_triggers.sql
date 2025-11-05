-- ==========================================
-- HarmoNet Migration Script
-- Phase9 修正版: updated_at トリガー削除対応 (Gemini監査結果反映)
-- Document ID: HNM-MIG-20251104-003
-- Created: 2025-11-04
-- Author: Claude (HarmoNet Design Specialist)
-- Reviewed by: Tachikoma (HarmoNet Architect)
-- ==========================================

-- ========== 背景 ==========
-- Gemini監査により、DB層のトリガーとPrisma層の更新ロジックが競合していることが判明。
-- Phase9設計思想では、updated_at の更新責務はアプリケーション層（Next.js / Prisma）に一元化。
-- このため、DB層のトリガーを削除する。

-- ========== SECTION 1: トリガー削除 ==========

-- tenants
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;

-- tenant_settings
DROP TRIGGER IF EXISTS update_tenant_settings_updated_at ON tenant_settings;

-- tenant_features
DROP TRIGGER IF EXISTS update_tenant_features_updated_at ON tenant_features;

-- users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- board_categories
DROP TRIGGER IF EXISTS update_board_categories_updated_at ON board_categories;

-- board_posts
DROP TRIGGER IF EXISTS update_board_posts_updated_at ON board_posts;

-- board_comments
DROP TRIGGER IF EXISTS update_board_comments_updated_at ON board_comments;

-- announcements
DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;

-- facilities
DROP TRIGGER IF EXISTS update_facilities_updated_at ON facilities;

-- facility_settings
DROP TRIGGER IF EXISTS update_facility_settings_updated_at ON facility_settings;

-- facility_reservations
DROP TRIGGER IF EXISTS update_facility_reservations_updated_at ON facility_reservations;

-- ========== SECTION 2: 関数削除 ==========

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========== 設計方針 ==========
-- 今後、updated_at の更新は以下の方法で行う:
-- 
-- 1. Prismaでの更新例:
--    await prisma.board_posts.update({
--      where: { id: postId },
--      data: { 
--        title: "新しいタイトル",
--        updated_at: new Date()  // 明示的に更新
--      }
--    });
--
-- 2. Windsurf / Cursor での実装時は updated_at = new Date() を必ず設定すること

-- ==========================================
-- Migration Complete
-- Total Triggers Removed: 11
-- Total Functions Removed: 1
-- Reason: Prisma manages updated_at in application layer
-- Design Philosophy: Single Responsibility (App layer handles timestamps)
-- ==========================================

-- Created: 2025-11-04
-- Last Updated: 2025-11-04
-- Version: 1.0
-- Document ID: HNM-MIG-20251104-003