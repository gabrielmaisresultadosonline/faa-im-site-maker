-- 1. Garantir que o schema auth_internal seja acessível para funções Security Definer e Auth
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth_internal') THEN
        GRANT USAGE ON SCHEMA auth_internal TO anon, authenticated, service_role, postgres;
        GRANT ALL ON ALL TABLES IN SCHEMA auth_internal TO anon, authenticated, service_role, postgres;
        GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth_internal TO anon, authenticated, service_role, postgres;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA auth_internal TO anon, authenticated, service_role, postgres;
    END IF;
END
$$;

-- 2. Garantir permissões nas funções públicas de login
GRANT EXECUTE ON FUNCTION public.login_extension_with_access_password(text, text, text) TO anon, authenticated, service_role;

-- 3. Garantir que o OWNER da função tenha acesso ao schema (caso não seja superuser)
ALTER SCHEMA auth_internal OWNER TO postgres;

-- 4. Adicionar GRANT nas tabelas críticas para o service_role usado pelo supabaseAdmin
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.app_settings TO service_role;

-- HINT: Se o erro "permission denied for schema auth_internal" persistir, 
-- é provável que a função RPC precise ser recriada explicitamente com o OWNER correto.
