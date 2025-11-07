-- ==========================================
-- HarmoNet Phase9.7 Auth Extension
-- Create invitations table
-- Created: 2025-11-07
-- Purpose: 招待管理テーブルの作成
-- ==========================================

-- CreateTable
CREATE TABLE IF NOT EXISTS invitations (
  id                   text PRIMARY KEY,
  tenant_id            text NOT NULL,
  email                text NOT NULL,
  invitation_code_hash text NOT NULL,
  role                 role_scope NOT NULL DEFAULT 'general_user',
  expires_at           timestamptz NOT NULL,
  used_at              timestamptz,
  status               invitation_status NOT NULL DEFAULT 'pending',
  invited_by_user_id   text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_tenant_email
  ON invitations(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_invitations_email 
  ON invitations(email);

CREATE INDEX IF NOT EXISTS idx_invitations_expires_at 
  ON invitations(expires_at);
