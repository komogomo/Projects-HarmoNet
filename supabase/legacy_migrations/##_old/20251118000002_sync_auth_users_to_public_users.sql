-- Sync auth.users -> public.users so that IDs and emails are kept in sync
-- This is especially useful for MagicLink / PKCE flows where auth.users is the
-- source of truth and application tables live under the public schema.

-- 1. Function: handle new auth.users rows
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth AS
$$
BEGIN
  -- Insert or update the corresponding row in public.users.
  --
  -- NOTE:
  -- - auth.users.id is UUID, but public.users.id is TEXT, so we cast to text.
  -- - display_name はメタデータにあればそれを使い、なければ email をそのまま使う。
  -- - language は当面 'ja' 固定とする（将来必要ならメタデータから拾う）。
  INSERT INTO public.users (id, email, display_name, language)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'ja'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- 2. Trigger: after insert on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();
