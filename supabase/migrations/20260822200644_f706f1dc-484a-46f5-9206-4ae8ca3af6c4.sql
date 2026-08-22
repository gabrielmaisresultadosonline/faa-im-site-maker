CREATE OR REPLACE FUNCTION auth_internal.login_extension_with_access_password(_email text, _access_password text, _session_id text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth_internal
AS $fn$
DECLARE
  _profile public.profiles%ROWTYPE;
  _subscription public.subscriptions%ROWTYPE;
  _settings jsonb := '{}'::jsonb;
  _multi_login_block boolean := false;
  _now timestamptz := clock_timestamp();
  _grace interval := interval '5 minutes';
  _active boolean := false;
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

  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  INTO _settings
  FROM public.app_settings
  WHERE key IN ('global_announcement', 'min_version', 'multi_login_block');

  _multi_login_block := coalesce((_settings->'multi_login_block')::boolean, false);

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

  IF _multi_login_block AND nullif(_session_id, '') IS NOT NULL THEN
    IF _profile.session_id IS NULL THEN
      UPDATE public.profiles SET session_id = _session_id WHERE id = _profile.id;
      _profile.session_id := _session_id;
    ELSIF _profile.session_id <> _session_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'MULTI_LOGIN',
        'error', 'Session already in use'
      );
    END IF;
  END IF;

  SELECT * INTO _subscription
  FROM public.subscriptions
  WHERE user_id = _profile.id
  ORDER BY
    (status = 'active'
      AND (expires_at IS NULL OR type = 'lifetime' OR expires_at + _grace > _now)) DESC,
    expires_at DESC NULLS FIRST,
    created_at DESC NULLS LAST
  LIMIT 1;

  _active := _subscription.id IS NOT NULL
    AND _subscription.status = 'active'
    AND (
      _subscription.type = 'lifetime'
      OR _subscription.expires_at IS NULL
      OR _subscription.expires_at + _grace > _now
    );

  UPDATE public.profiles
  SET last_login_at = _now,
      last_heartbeat_at = _now
  WHERE id = _profile.id;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'name', coalesce(_profile.full_name, ''),
      'email', _profile.email,
      'language', _profile.language,
      'plan', _subscription.type,
      'expires_at', _subscription.expires_at,
      'is_active', _active,
      'is_expired', NOT _active,
      'blocked', false,
      'custom_message', coalesce(_profile.custom_message, ''),
      'global_announcement', coalesce(_settings->>'global_announcement', ''),
      'min_version', coalesce(_settings->>'min_version', '1.0.0')
    )
  );
END;
$fn$;