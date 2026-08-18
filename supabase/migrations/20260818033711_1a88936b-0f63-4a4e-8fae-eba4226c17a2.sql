-- Corrigindo as permissões da função RPC para que a extensão consiga logar
-- A função precisa acessar o schema auth_internal que foi criado anteriormente

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

-- Garante que a função RPC possa ser executada por usuários anônimos (extensão antes do login)
-- Nota: A assinatura da função pode variar, verificamos no backend se ela existe.
GRANT EXECUTE ON FUNCTION public.login_extension_with_access_password(text, text, text) TO anon, authenticated;

-- Garantindo que o webhook consiga atualizar transações e assinaturas
GRANT ALL ON TABLE public.infinitepay_transactions TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.profiles TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.user_roles TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.app_settings TO authenticated, service_role, anon;
