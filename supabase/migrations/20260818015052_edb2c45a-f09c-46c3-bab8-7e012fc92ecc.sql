
-- Revogamos execução pública/autenticada da função de trigger por segurança
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- Permite apenas ao dono (postgres) e ao serviço de autenticação
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
