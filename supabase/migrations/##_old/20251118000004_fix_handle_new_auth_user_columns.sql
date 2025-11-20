-- Ensure handle_new_auth_user populates all NOT NULL columns on public.users
-- so that the sync from auth.users does not fail silently.

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
    INSERT INTO public.users (
      id,
      tenant_id,
      email,
      display_name,
      language,
      created_at,
      updated_at,
      status
    )
    VALUES (
      NEW.id::text,
      NULL,                    -- no tenant yet at auth-signup time
      NEW.email,
      v_display_name,
      'ja',                    -- default language
      now(),
      now(),
      'active'::status
    )
    ON CONFLICT (id) DO UPDATE
      SET email        = EXCLUDED.email,
          display_name = EXCLUDED.display_name;
  EXCEPTION WHEN others THEN
    -- Best-effort sync only; never break Auth flows because of app-side schema.
    NULL;
  END;

  RETURN NEW;
END;
$$;
