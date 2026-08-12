ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pt' CHECK (language IN ('pt','en'));

ALTER TABLE public.infinitepay_transactions
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL','USD')),
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'infinitepay' CHECK (provider IN ('infinitepay','stripe')),
  ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_infinitepay_transactions_session_id ON public.infinitepay_transactions (session_id);

CREATE OR REPLACE FUNCTION auth_internal.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, full_name, whatsapp, language)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'whatsapp',
    coalesce(nullif(new.raw_user_meta_data->>'language',''), 'pt')
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

REVOKE EXECUTE ON FUNCTION auth_internal.handle_new_user() FROM PUBLIC, anon, authenticated;