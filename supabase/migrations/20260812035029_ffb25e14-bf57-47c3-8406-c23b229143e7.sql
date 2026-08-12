-- 1) profiles: add WITH CHECK + block privileged column changes by regular users
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins (and service role / triggers running without a JWT) may change anything
  IF auth.uid() IS NULL OR auth_internal.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Regular users cannot escalate or tamper with administrative fields
  NEW.id              := OLD.id;
  NEW.blocked         := OLD.blocked;
  NEW.access_password := OLD.access_password;
  NEW.custom_message  := OLD.custom_message;
  NEW.last_login_at   := OLD.last_login_at;
  NEW.session_id      := OLD.session_id;
  NEW.email           := OLD.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_admin_fields ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();

-- 2) infinitepay_transactions: make UPDATE/DELETE restrictions explicit (admin only)
DROP POLICY IF EXISTS "Admins can update transactions" ON public.infinitepay_transactions;
CREATE POLICY "Admins can update transactions"
ON public.infinitepay_transactions
FOR UPDATE
TO authenticated
USING (auth_internal.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth_internal.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete transactions" ON public.infinitepay_transactions;
CREATE POLICY "Admins can delete transactions"
ON public.infinitepay_transactions
FOR DELETE
TO authenticated
USING (auth_internal.has_role(auth.uid(), 'admin'::app_role));