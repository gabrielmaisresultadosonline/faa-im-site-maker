-- 1) Restrict app_settings reads to an allowlist of non-sensitive keys
DROP POLICY IF EXISTS "Users can read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Everyone can read app_settings" ON public.app_settings;

CREATE POLICY "Users can read public settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  key IN ('download_link', 'tutorials', 'global_announcement', 'min_version')
  OR auth_internal.has_role(auth.uid(), 'admin'::app_role)
);

-- 2) Allow users to create only their own profile row
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);