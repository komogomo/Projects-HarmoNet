-- ============================================
-- Trigger: Default Shortcut Menu Auto-Insert
-- Created: 2025-11-20
-- Purpose: 新規テナント作成時に標準5項目を自動挿入
-- Reference: common-frame-components_detail-design_v1.0.md 表5.2.4
-- ============================================

-- Function: デフォルトショートカットメニュー挿入
CREATE OR REPLACE FUNCTION insert_default_shortcut_menu()
RETURNS TRIGGER AS $$
BEGIN
  -- 標準5項目をテナントに自動挿入（表示順1-5）
  INSERT INTO tenant_shortcut_menu (
    id, 
    tenant_id, 
    feature_key, 
    label_key, 
    icon, 
    display_order, 
    enabled, 
    status
  )
  VALUES
    -- 1. ホーム
    (
      gen_random_uuid(), 
      NEW.id, 
      'home', 
      'nav.home', 
      'Home', 
      1, 
      true, 
      'active'
    ),
    -- 2. 掲示板
    (
      gen_random_uuid(), 
      NEW.id, 
      'board', 
      'nav.board', 
      'MessageSquare', 
      2, 
      true, 
      'active'
    ),
    -- 3. 施設予約
    (
      gen_random_uuid(), 
      NEW.id, 
      'facility', 
      'nav.facility', 
      'Calendar', 
      3, 
      true, 
      'active'
    ),
    -- 4. マイページ
    (
      gen_random_uuid(), 
      NEW.id, 
      'mypage', 
      'nav.mypage', 
      'User', 
      4, 
      true, 
      'active'
    ),
    -- 5. ログアウト
    (
      gen_random_uuid(), 
      NEW.id, 
      'logout', 
      'nav.logout', 
      'LogOut', 
      5, 
      true, 
      'active'
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: テナント作成後にデフォルトショートカットメニューを自動挿入
CREATE TRIGGER after_tenant_insert
AFTER INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION insert_default_shortcut_menu();

-- コメント
COMMENT ON FUNCTION insert_default_shortcut_menu() IS 
'新規テナント作成時に標準5項目（home/board/facility/mypage/logout）のショートカットメニューを自動挿入';

COMMENT ON TRIGGER after_tenant_insert ON tenants IS 
'テナント作成後にデフォルトショートカットメニューを自動挿入するトリガー';
