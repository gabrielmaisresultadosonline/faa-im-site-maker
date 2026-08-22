CREATE POLICY "Users can activate own limited trial"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND type = 'trial'
  AND status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at > clock_timestamp()
  AND expires_at <= clock_timestamp() + interval '21 minutes'
);

GRANT INSERT ON public.subscriptions TO authenticated;

ALTER FUNCTION public.activate_free_trial() SECURITY INVOKER;