-- Hardening assets bucket security and fixing access issues

-- 1. Ensure the 'assets' bucket exists (via SQL for metadata if needed, but primary check is grants)
-- Note: On Lovable, the bucket must be created via UI or API first. These policies assume it exists.

-- 2. Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON SCHEMA storage TO service_role;

-- 3. Correcting RLS policies for the 'assets' bucket
-- Users (anon and authenticated) need to READ assets
-- Admins need to ALL objects.

-- Drop old policies if they exist to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
    DROP POLICY IF EXISTS "Admins Manage Assets" ON storage.objects;
END $$;

-- Policy for anyone to read public objects in the 'assets' bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Policy for Admins to manage objects in the 'assets' bucket
CREATE POLICY "Admins Manage Assets"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'assets' AND 
    auth_internal.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
    bucket_id = 'assets' AND 
    auth_internal.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 4. Fix possible grant issue on auth_internal.has_role
GRANT EXECUTE ON FUNCTION auth_internal.has_role(uuid, public.app_role) TO authenticated;

-- 5. Fix profiles update check
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow heartbeat update' AND tablename = 'profiles') THEN
        CREATE POLICY "Allow heartbeat update" ON public.profiles
        FOR UPDATE TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;
