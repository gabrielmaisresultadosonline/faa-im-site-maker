-- Add language column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt' CHECK (language IN ('pt', 'en'));

-- Update existing profiles to 'pt'
UPDATE public.profiles SET language = 'pt' WHERE language IS NULL;

-- Grant access
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
