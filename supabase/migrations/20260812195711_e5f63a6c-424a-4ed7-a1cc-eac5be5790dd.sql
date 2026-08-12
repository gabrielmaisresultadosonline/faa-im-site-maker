-- Restaurar permissão de execução para usuários autenticados (necessário para RLS funcionar com has_role)
GRANT EXECUTE ON FUNCTION auth_internal.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION auth_internal.has_role(uuid, public.app_role) TO service_role;

-- Garantir que a tabela user_roles pode ser lida por usuários autenticados (para o utilitário isAdmin do frontend)
GRANT SELECT ON public.user_roles TO authenticated;

-- Garantir que o email do admin mestre tenha a role de admin se ainda não tiver
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'mro@Gmail.com' LIMIT 1;
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
