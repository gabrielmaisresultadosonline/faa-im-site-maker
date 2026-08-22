CREATE OR REPLACE FUNCTION public.activate_free_trial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing public.subscriptions%ROWTYPE;
  v_access_password text;
  v_expires_at timestamptz := clock_timestamp() + interval '20 minutes';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT * INTO v_existing
  FROM public.subscriptions
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.type = 'trial' THEN
      RAISE EXCEPTION 'TRIAL_ALREADY_USED';
    END IF;

    IF v_existing.status = 'active'
       AND (v_existing.expires_at IS NULL OR v_existing.expires_at > clock_timestamp()) THEN
      RAISE EXCEPTION 'ACTIVE_PAID_PLAN';
    END IF;

    RAISE EXCEPTION 'TRIAL_NOT_AVAILABLE';
  END IF;

  SELECT access_password INTO v_access_password
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_access_password IS NULL OR length(trim(v_access_password)) = 0 THEN
    v_access_password := upper(substr(encode(gen_random_bytes(12), 'hex'), 1, 8));
  END IF;

  INSERT INTO public.profiles (id, access_password, updated_at)
  VALUES (v_user_id, v_access_password, clock_timestamp())
  ON CONFLICT (id) DO UPDATE
  SET access_password = COALESCE(NULLIF(public.profiles.access_password, ''), EXCLUDED.access_password),
      updated_at = clock_timestamp()
  RETURNING access_password INTO v_access_password;

  INSERT INTO public.subscriptions (user_id, type, status, expires_at)
  VALUES (v_user_id, 'trial', 'active', v_expires_at);

  RETURN jsonb_build_object(
    'expiresAt', v_expires_at,
    'accessPassword', v_access_password
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_free_trial() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_free_trial() TO authenticated;