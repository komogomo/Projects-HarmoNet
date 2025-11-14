-- =============================================
-- 20251114000000_add_passkey_credentials.sql
-- WebAuthn Passkey 認証情報テーブルの追加（HarmoNet）
-- HarmoNet Supabase Migration Rule 準拠
-- =============================================

-- WebAuthn Passkey 認証情報テーブル
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  tenant_id      TEXT NOT NULL,
  credential_id  TEXT UNIQUE NOT NULL,
  public_key     TEXT NOT NULL,
  sign_count     INTEGER NOT NULL DEFAULT 0,
  transports     TEXT[],
  device_name    TEXT,
  platform       TEXT,
  last_used_at   TIMESTAMPTZ(6),
  created_at     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  -- 外部キー制約
  CONSTRAINT fk_passkey_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_passkey_tenant 
    FOREIGN KEY (tenant_id) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS passkey_credentials_user_id_idx 
  ON passkey_credentials(user_id);

CREATE INDEX IF NOT EXISTS passkey_credentials_tenant_id_idx 
  ON passkey_credentials(tenant_id);

-- コメント
COMMENT ON TABLE passkey_credentials IS 'WebAuthn Passkey認証情報';
COMMENT ON COLUMN passkey_credentials.credential_id IS 'WebAuthn Credential ID (Base64URL)';
COMMENT ON COLUMN passkey_credentials.public_key IS '公開鍵 (COSE形式)';
COMMENT ON COLUMN passkey_credentials.sign_count IS '署名カウンター (リプレイ攻撃防止)';
COMMENT ON COLUMN passkey_credentials.transports IS '利用可能なトランスポート (usb, nfc, ble, internal)';
