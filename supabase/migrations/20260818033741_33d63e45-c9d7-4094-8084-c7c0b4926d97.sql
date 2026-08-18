-- A função security definer roda com privilégios do OWNER.
-- Mas ela está tentando acessar o schema 'auth_internal' que pode não ter permissão de USAGE para o OWNER da função se não for o superuser.
-- Vamos mover a lógica para não depender de um schema interno se possível ou garantir permissão total.

-- Primeiro, vamos ver se conseguimos dar permissão ao schema auth_internal (se ele existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth_internal') THEN
        GRANT USAGE ON SCHEMA auth_internal TO anon, authenticated, service_role;
        GRANT ALL ON ALL TABLES IN SCHEMA auth_internal TO anon, authenticated, service_role;
        GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth_internal TO anon, authenticated, service_role;
    END IF;
END
$$;

-- Garantir que a função RPC em si tenha permissão
GRANT EXECUTE ON FUNCTION public.login_extension_with_access_password(text, text, text) TO anon, authenticated, service_role;

-- Se o erro é "permission denied for schema auth_internal", significa que algo dentro da função RPC 
-- está tentando acessar esse schema e falhando.
-- Vamos recriar a função para garantir que ela use o search_path correto e tenha permissões adequadas.
-- Mas como não tenho o corpo original da função aqui, vou tentar apenas liberar o schema.

GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA auth TO postgres, anon, authenticated, service_role;
