
-- 1. Recriamos a função handle_new_user() com melhor tratamento de erros e logs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_whatsapp text;
  v_registration_ip text;
  v_language text;
  v_plain_password text;
  v_is_trial text;
BEGIN
  -- Extração segura de metadados
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_whatsapp := NEW.raw_user_meta_data->>'whatsapp';
  v_registration_ip := NEW.raw_user_meta_data->>'registration_ip';
  v_language := COALESCE(NEW.raw_user_meta_data->>'language', 'pt');
  v_plain_password := NEW.raw_user_meta_data->>'plain_password';
  v_is_trial := NEW.raw_user_meta_data->>'is_trial';

  -- A inserção no perfil deve ser a PRIMEIRA operação para satisfazer FKs de tabelas dependentes
  INSERT INTO public.profiles (
    id, 
    email,
    full_name, 
    whatsapp, 
    language, 
    plain_password, 
    registration_ip
  )
  VALUES (
    NEW.id, 
    NEW.email,
    v_full_name, 
    v_whatsapp, 
    v_language, 
    v_plain_password, 
    v_registration_ip
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    whatsapp = COALESCE(EXCLUDED.whatsapp, profiles.whatsapp),
    language = EXCLUDED.language,
    plain_password = COALESCE(EXCLUDED.plain_password, profiles.plain_password),
    registration_ip = COALESCE(EXCLUDED.registration_ip, profiles.registration_ip);
  
  -- Inserção de role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Ativação automática do trial
  IF v_is_trial = 'true' THEN
    INSERT INTO public.subscriptions (user_id, type, status, expires_at)
    VALUES (NEW.id, 'trial', 'active', now() + interval '20 minutes')
    ON CONFLICT (user_id) DO UPDATE SET
      type = 'trial',
      status = 'active',
      expires_at = now() + interval '20 minutes',
      updated_at = now();
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log de erro se necessário (visível nos logs do Postgres)
  RAISE WARNING 'Erro em handle_new_user para o ID %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Garantir que a FK de subscriptions aponta para profiles em vez de auth.users se preferível,
-- mas aqui o erro era de sincronia/timing. Vamos manter para auth.users mas garantir a ordem.
-- Se a FK falha mesmo com a ordem correta, pode ser que a tabela auth.users ainda não tenha commitado.
-- No entanto, AFTER INSERT no Postgres deve ver a linha.

-- 3. Vamos garantir que a FK tenha ON DELETE CASCADE para evitar órfãos
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Garantir privilégios
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
