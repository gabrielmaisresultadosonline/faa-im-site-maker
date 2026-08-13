-- Script para garantir que o usuário mro@gmail.com exista com a senha correta
DO $$
DECLARE
  target_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- 1. Tenta encontrar o usuário
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'mro@gmail.com';

  -- 2. Gera o hash da senha 'Ga145523'
  encrypted_pw := crypt('Ga145523', gen_salt('bf'));

  IF target_user_id IS NULL THEN
    -- 3. Cria o usuário se não existir
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'mro@gmail.com',
      encrypted_pw,
      now(),
      NULL,
      NULL,
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Admin MRO"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO target_user_id;
  ELSE
    -- 4. Atualiza a senha e confirma o email se já existir
    UPDATE auth.users 
    SET 
      encrypted_password = encrypted_pw,
      email_confirmed_at = now(),
      updated_at = now(),
      raw_app_meta_data = raw_app_meta_data || '{"provider": "email", "providers": ["email"]}'
    WHERE id = target_user_id;
  END IF;

  -- 5. Garante a role admin na tabela pública
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;
