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
      if (process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['VITE_SUPABASE_URL']) {
        client = supabaseAdmin;
      }
    } catch (e) {
      console.warn("supabaseAdmin not available, using public client");
    }

    // Se o cliente for o proxy dummy (supabaseAdmin nulo), storage será uma função dummy
    // que retorna um objeto com erro.
    let signedData: any = null;
    let error: any = null;

    try {
      if (typeof client.storage === 'function') {
        // Se for o dummy proxy do client.server.ts
        const result = client.storage();
        error = result.error;
      } else {
        const result = await client.storage
          .from('assets')
          .createSignedUrl(data.path, 86400);
        signedData = result.data;
        error = result.error;
      }
    } catch (e) {
      error = e;
    }

    if (error || !signedData?.signedUrl) {
      console.error("Error creating signed URL, using fallback:", error);
      // Fallback para URL pública se o bucket permitir ou se a key service role falhar
      const publicUrl = `https://zjvmfmdyuxmyanuuralq.supabase.co/storage/v1/object/public/assets/${data.path}`;
      return { url: publicUrl };
    }

    return { url: signedData.signedUrl };
  });
