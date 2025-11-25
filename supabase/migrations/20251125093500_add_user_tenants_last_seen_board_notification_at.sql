alter table public.user_tenants
  add column if not exists last_seen_board_notification_at timestamptz(6);
