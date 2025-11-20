-- ==========================================
-- HarmoNet Phase9.7 Auth Extension
-- Add invitation_status ENUM
-- Created: 2025-11-07
-- Purpose: 招待ステータスENUMの追加
-- ==========================================

-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM (
  'pending',
  'accepted',
  'expired',
  'revoked'
);
