-- Adiciona a coluna plain_password na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plain_password TEXT;

-- Atualiza a função que sincroniza o perfil para incluir o plain_password do metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, whatsapp, language, plain_password)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'whatsapp',
    COALESCE(new.raw_user_meta_data->>'language', 'pt'),
    new.raw_user_meta_data->>'plain_password'
  );
  RETURN new;
END;
$$;