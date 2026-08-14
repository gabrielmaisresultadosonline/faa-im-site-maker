
-- 1. Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON SCHEMA storage TO service_role;

-- 2. Correcting RLS policies for the 'assets' bucket
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

-- 3. Fix grant issue on has_role
GRANT EXECUTE ON FUNCTION auth_internal.has_role(uuid, public.app_role) TO authenticated;
