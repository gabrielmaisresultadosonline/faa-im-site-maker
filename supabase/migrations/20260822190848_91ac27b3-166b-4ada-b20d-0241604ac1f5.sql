GRANT USAGE ON SCHEMA auth_internal TO service_role;
GRANT ALL ON SCHEMA auth_internal TO service_role;
GRANT EXECUTE ON FUNCTION auth_internal.login_extension_with_access_password(text, text, text) TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA auth_internal TO service_role;

-- Adicionalmente, garantir que a service_role possa ler profiles e subscriptions sem RLS impedir a função SECURITY DEFINER
GRANT SELECT ON public.profiles TO service_role;
GRANT SELECT ON public.subscriptions TO service_role;
GRANT SELECT ON public.app_settings TO service_role;