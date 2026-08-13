-- Corrigir a cache do PostgREST e garantir que as foreign keys sejam reconhecidas
-- O erro PGRST200 indica que o PostgREST não está encontrando a relação entre as tabelas.

-- 1. Forçar a recarga do esquema
NOTIFY pgrst, 'reload schema';

-- 2. Garantir que as Foreign Keys existam explicitamente
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_fkey') THEN
        ALTER TABLE public.subscriptions 
        ADD CONSTRAINT subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'infinitepay_transactions_user_id_fkey') THEN
        ALTER TABLE public.infinitepay_transactions 
        ADD CONSTRAINT infinitepay_transactions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey') THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Garantir GRANTs de visualização para o Painel Administrativo
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.infinitepay_transactions TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 4. Ajustar as permissões da função de Admin
GRANT EXECUTE ON FUNCTION auth_internal.has_role(uuid, public.app_role) TO authenticated;

-- 5. Recriar políticas de Admin para garantir acesso total no Dashboard
DROP POLICY IF EXISTS "Admins can see all profiles" ON public.profiles;
CREATE POLICY "Admins can see all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth_internal.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can see all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can see all subscriptions" 
ON public.subscriptions FOR SELECT 
TO authenticated 
USING (auth_internal.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can see all transactions" ON public.infinitepay_transactions;
CREATE POLICY "Admins can see all transactions" 
ON public.infinitepay_transactions FOR SELECT 
TO authenticated 
USING (auth_internal.has_role(auth.uid(), 'admin'));
