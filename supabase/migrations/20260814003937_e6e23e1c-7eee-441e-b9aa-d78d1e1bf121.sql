
-- Garantir permissões de SELECT para todos (anon/auth) nos objetos do bucket assets
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Garantir que usuários autenticados possam criar signed URLs (requer leitura do bucket e do objeto)
GRANT SELECT ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;
