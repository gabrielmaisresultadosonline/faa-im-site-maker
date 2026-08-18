import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const getSignedVideoUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // Tenta carregar o admin client de forma segura para evitar quebra de runtime se faltar a key
    let client: any = supabase;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // O proxy do supabaseAdmin vai lançar erro se acessado sem a key configurada
      // mas o import em si é seguro.
      if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
        client = supabaseAdmin;
      }
    } catch (e) {
      console.warn("supabaseAdmin not available, using public client");
    }

    const { data: signedData, error } = await client.storage
      .from('assets')
      .createSignedUrl(data.path, 86400);

    if (error) {
      console.error("Error creating signed URL:", error);
      // Fallback para URL pública se o bucket permitir ou se a key service role falhar
      const publicUrl = `https://zjvmfmdyuxmyanuuralq.supabase.co/storage/v1/object/public/assets/${data.path}`;
      return { url: publicUrl };
    }

    return { url: signedData.signedUrl };
  });
