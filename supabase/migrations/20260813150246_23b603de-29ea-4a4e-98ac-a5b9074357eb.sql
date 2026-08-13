-- Policies para permitir upload apenas por admins autenticados
-- A função correta é auth_internal.has_role
CREATE POLICY "Admins can upload assets" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'assets' AND auth_internal.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update assets" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'assets' AND auth_internal.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete assets" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'assets' AND auth_internal.has_role(auth.uid(), 'admin'::public.app_role));

-- Permitir leitura pública para que usuários vejam os vídeos e baixem a extensão
CREATE POLICY "Public read for assets" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'assets');
