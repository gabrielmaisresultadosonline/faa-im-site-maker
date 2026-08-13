-- Fix for creating users manually from Admin Dashboard

-- 1. Ensure user_roles can be read for RLS checks even if not service_role
GRANT SELECT ON public.user_roles TO authenticated;

-- 2. Ensure profiles can be updated by admin
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth_internal.has_role(auth.uid(), 'admin'));

-- 3. Ensure subscriptions can be upserted by admin
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions" 
ON public.subscriptions 
FOR ALL 
TO authenticated 
USING (auth_internal.has_role(auth.uid(), 'admin'))
WITH CHECK (auth_internal.has_role(auth.uid(), 'admin'));

-- 4. Grant access to infinitepay_transactions and subscriptions for Admin dashboard queries
GRANT SELECT ON public.infinitepay_transactions TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

-- 5. Fix RLS for infinitepay_transactions
DROP POLICY IF EXISTS "Admins can see all transactions" ON public.infinitepay_transactions;
CREATE POLICY "Admins can see all transactions"
ON public.infinitepay_transactions
FOR SELECT
TO authenticated
USING (auth_internal.has_role(auth.uid(), 'admin'));
