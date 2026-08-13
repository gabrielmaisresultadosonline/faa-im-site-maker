-- Script para resetar senha e confirmar email do admin
DO $$
DECLARE
    target_user_id UUID;
    encrypted_pw TEXT;
BEGIN
    -- Busca o ID do usuário
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'mro@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- Criptografa a senha desejada 'Ga145523' usando pgcrypto (extensão nativa do Supabase)
        encrypted_pw := crypt('Ga145523', gen_salt('bf'));

        -- Atualiza a senha e marca email como confirmado
        UPDATE auth.users 
        SET 
            encrypted_password = encrypted_pw,
            email_confirmed_at = now(),
            last_sign_in_at = NULL -- Força um novo login limpo
        WHERE id = target_user_id;

        -- Garante que ele tenha a role admin (redundância de segurança)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
