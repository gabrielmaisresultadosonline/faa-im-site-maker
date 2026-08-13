-- Create Extension Notices and Documentation table
CREATE TABLE public.extension_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension_id TEXT NOT NULL, -- Logical ID for the extension (e.g. 'extensao_1')
    notice_type TEXT NOT NULL CHECK (notice_type IN ('info', 'block')),
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'video', 'image', 'button')),
    content TEXT NOT NULL, -- Text content, URL for video/image, or JSON for button
    image_thumb_url TEXT, -- Optional thumbnail for any notice type
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Documentation table for extensions
CREATE TABLE public.extension_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Markdown or HTML content
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grants
GRANT SELECT ON public.extension_notices TO authenticated;
GRANT SELECT ON public.extension_notices TO anon;
GRANT ALL ON public.extension_notices TO service_role;

GRANT SELECT ON public.extension_docs TO authenticated;
GRANT SELECT ON public.extension_docs TO anon;
GRANT ALL ON public.extension_docs TO service_role;

-- RLS
ALTER TABLE public.extension_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_docs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read for notices" ON public.extension_notices FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins manage notices" ON public.extension_notices FOR ALL TO authenticated USING (auth_internal.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read for docs" ON public.extension_docs FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage docs" ON public.extension_docs FOR ALL TO authenticated USING (auth_internal.has_role(auth.uid(), 'admin'));