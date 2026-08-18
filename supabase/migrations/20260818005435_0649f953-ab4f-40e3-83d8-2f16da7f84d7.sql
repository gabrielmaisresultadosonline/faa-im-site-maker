ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_ip TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, whatsapp, registration_ip)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'whatsapp',
    NEW.raw_user_meta_data->>'registration_ip'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  IF NEW.raw_user_meta_data->>'is_trial' = 'true' THEN
    INSERT INTO public.subscriptions (user_id, type, status, expires_at)
    VALUES (NEW.id, 'trial', 'active', now() + interval '20 minutes');
  END IF;
  
  RETURN NEW;
END;
$$;

GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;