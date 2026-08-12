ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_message text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_id text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

CREATE OR REPLACE FUNCTION auth_internal.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, full_name, whatsapp, email, language)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'whatsapp',
    new.email,
    coalesce(new.raw_user_meta_data->>'language', 'pt')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  if new.raw_user_meta_data->>'is_trial' = 'true' then
    insert into public.subscriptions (user_id, type, status, expires_at)
    values (new.id, 'trial', 'active', now() + interval '20 minutes');
  end if;

  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can manage all profiles') THEN
    CREATE POLICY "Admins can manage all profiles" ON public.profiles
      FOR ALL TO authenticated
      USING (auth_internal.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (auth_internal.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.app_settings TO service_role;

INSERT INTO public.app_settings (key, value)
VALUES
  ('global_announcement', '""'::jsonb),
  ('min_version', '"1.0.0"'::jsonb),
  ('multi_login_block', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;