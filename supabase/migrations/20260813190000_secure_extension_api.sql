-- Migration: consolidate extension login logic and remove service role dependency in API

-- 1. Create a consolidated logic function (Internal)
CREATE OR REPLACE FUNCTION public.internal_get_extension_user_data(
  _profile public.profiles,
  _session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _subscription public.subscriptions%ROWTYPE;
  _settings jsonb := '{}'::jsonb;
  _multi_login_block boolean := false;
  _now timestamptz := clock_timestamp();
BEGIN
  -- Fetch relevant settings
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  INTO _settings
  FROM public.app_settings
  WHERE key IN ('global_announcement', 'min_version', 'multi_login_block');

  _multi_login_block := coalesce((_settings->'multi_login_block')::boolean, false);

  -- Check if blocked
  IF _profile.blocked THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'BLOCKED',
      'user', jsonb_build_object(
        'blocked', true,
        'custom_message', coalesce(_profile.custom_message, '')
      )
    );
  END IF;

  -- Multi-login session locking
  IF _multi_login_block AND nullif(_session_id, '') IS NOT NULL THEN
    IF _profile.session_id IS NULL THEN
      UPDATE public.profiles SET session_id = _session_id WHERE id = _profile.id;
    ELSIF _profile.session_id <> _session_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'MULTI_LOGIN',
        'error', 'Session already in use'
      );
    END IF;
  END IF;

  -- Fetch latest subscription
  SELECT * INTO _subscription
  FROM public.subscriptions
  WHERE user_id = _profile.id
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  -- Update heartbeats
  UPDATE public.profiles
  SET last_login_at = _now,
      last_heartbeat_at = _now
  WHERE id = _profile.id;

  -- Final response
  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'name', coalesce(_profile.full_name, ''),
      'email', _profile.email,
      'language', _profile.language,
      'plan', _subscription.type,
      'expires_at', _subscription.expires_at,
      'is_active', _subscription.id IS NOT NULL 
        AND _subscription.status = 'active' 
        AND _subscription.expires_at > _now,
      'is_expired', _subscription.id IS NULL OR _subscription.expires_at <= _now,
      'blocked', false,
      'custom_message', coalesce(_profile.custom_message, ''),
      'global_announcement', coalesce(_settings->>'global_announcement', ''),
      'min_version', coalesce(_settings->>'min_version', '1.0.0')
    )
  );
END;
$$;

-- 2. Update login_extension_with_access_password to use the internal helper
CREATE OR REPLACE FUNCTION public.login_extension_with_access_password(
  _email text,
  _access_password text,
  _session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
BEGIN
  IF length(trim(coalesce(_email, ''))) = 0
     OR length(coalesce(_access_password, '')) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;

  SELECT * INTO _profile
  FROM public.profiles
  WHERE lower(email) = lower(trim(_email))
    AND access_password = _access_password
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;

  RETURN public.internal_get_extension_user_data(_profile, _session_id);
END;
$$;

-- 3. Create a new function for authenticated users (Supabase Auth)
CREATE OR REPLACE FUNCTION public.get_extension_user_data(
  _session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE id = _user_id;
  
  IF NOT FOUND THEN
     RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN public.internal_get_extension_user_data(_profile, _session_id);
END;
$$;

-- 4. Set permissions
REVOKE ALL ON FUNCTION public.internal_get_extension_user_data(public.profiles, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_extension_with_access_password(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_extension_user_data(text) TO authenticated, service_role;
