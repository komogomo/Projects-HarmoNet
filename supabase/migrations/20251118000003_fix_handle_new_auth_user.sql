-- Harden handle_new_auth_user so that failures in app-side sync do NOT break
-- Supabase Auth signInWithOtp (which would surface as 500 errors).

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_display_name text;
BEGIN
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email);

  BEGIN
    -- Best-effort sync: if this INSERT fails for any reason, we swallow the
    -- error so that auth.users INSERT still succeeds and MagicLink login is
    -- not broken. Application code will then treat the user as "not yet in
    -- app DB" until a proper sync is performed.
    INSERT INTO public.users (id, email, display_name)
    VALUES (
      NEW.id::text,
      NEW.email,
      v_display_name
    )
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email;
  EXCEPTION WHEN others THEN
    -- TODO: optionally log to a dedicated table later; for now, ignore.
    NULL;
  END;

  RETURN NEW;
END;
$$;
