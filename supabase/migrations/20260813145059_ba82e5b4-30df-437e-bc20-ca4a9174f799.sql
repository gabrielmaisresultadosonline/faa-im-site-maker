-- Script para garantir que o usuário mro@gmail.com tenha a role de admin
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Busca o ID do usuário pelo email na tabela auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'mro@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- Insere na tabela user_roles se não existir
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
