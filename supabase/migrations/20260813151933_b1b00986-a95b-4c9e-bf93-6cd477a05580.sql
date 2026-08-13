ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- Policy should already allow update by authenticated user for their own profile,
-- but we ensure the API can update this field.
GRANT UPDATE (last_heartbeat_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
