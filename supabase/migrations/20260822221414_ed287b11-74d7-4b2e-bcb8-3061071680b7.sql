
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
  _grace_period interval := interval '5 minutes';
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

  -- Fetch latest subscription (preferring lifetime or active ones)
  SELECT * INTO _subscription
  FROM public.subscriptions
  WHERE user_id = _profile.id
  ORDER BY 
    CASE WHEN type = 'lifetime' THEN 0 ELSE 1 END,
    expires_at DESC NULLS LAST
  LIMIT 1;

  -- Update heartbeats
  UPDATE public.profiles
  SET last_login_at = _now,
      last_heartbeat_at = _now
  WHERE id = _profile.id;

  -- Final response with 5 min grace period and lifetime support
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
        AND (
          _subscription.type = 'lifetime' 
          OR _subscription.expires_at + _grace_period > _now
        ),
      'is_expired', NOT (
        _subscription.id IS NOT NULL 
        AND _subscription.status = 'active' 
        AND (
          _subscription.type = 'lifetime' 
          OR _subscription.expires_at + _grace_period > _now
        )
      ),
      'blocked', false,
      'custom_message', coalesce(_profile.custom_message, ''),
      'global_announcement', coalesce(_settings->>'global_announcement', ''),
      'min_version', coalesce(_settings->>'min_version', '1.0.0')
    )
  );
END;
$$;
