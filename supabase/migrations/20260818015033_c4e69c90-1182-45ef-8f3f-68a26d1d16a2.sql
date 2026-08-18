
-- 1. Removemos as funções duplicadas ou conflitantes se necessário
-- 2. Recriamos a handle_new_user no schema public com todas as colunas necessárias
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Inserção no perfil capturando todos os metadados enviados pelo frontend
  INSERT INTO public.profiles (
    id, 
    full_name, 
    whatsapp, 
    email, 
    language, 
    plain_password, 
    registration_ip
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'whatsapp',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'language', 'pt'),
    NEW.raw_user_meta_data->>'plain_password',
    NEW.raw_user_meta_data->>'registration_ip'
  );
  
  -- Garantir que o usuário comece com a role 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Ativação automática do trial se solicitado
  IF NEW.raw_user_meta_data->>'is_trial' = 'true' THEN
    INSERT INTO public.subscriptions (user_id, type, status, expires_at)
    VALUES (NEW.id, 'trial', 'active', now() + interval '20 minutes');
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Atualizamos o gatilho para usar a função correta
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
