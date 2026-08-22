import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Gera a URL de reprodução de um vídeo armazenado no bucket "assets" usando Signed URLs.
 * 
 * O bucket "assets" é privado no Lovable Cloud (public: false).
 * Esta função recebe o path do objeto e retorna uma URL assinada válida por 7 dias.
 */
export const getSignedVideoUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // Domínio oficial do backend Supabase
    const SUPABASE_PROJECT_ID = "zjvmfmdyuxmyanuuralq";
    const baseUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

    // Normaliza o path: remove prefixos de URL e query parameters
    let fileName = data.path;
    
    // Se vier uma URL completa (ex: de dados legados no banco), extraímos apenas o nome do arquivo
    if (fileName.includes("supabase.co")) {
      const parts = fileName.split('/');
      fileName = parts[parts.length - 1] || fileName;
    }

    // Remove qualquer query parameter (ex: ?t=...)
    fileName = fileName.split('?')[0] || "";
    // Remove prefixo de bucket se presente
    fileName = fileName.replace(/^assets\//, "").replace(/^\/+/, "");

    if (!fileName) {
      return { url: "", error: "INVALID_VIDEO_PATH" as const };
    }

    // Tenta obter a service role key do ambiente (PM2/Lovable Cloud)
    const signingKey =
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
      process.env['VITE_SUPABASE_SERVICE_ROLE_KEY'] ||
      process.env['SUPABASE_PUBLISHABLE_KEY'] ||
      process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
      import.meta.env['VITE_SUPABASE_ANON_KEY'] ||
      "sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7";

    try {
      console.log(`[VideoAuth] OBRIGATÓRIO: Gerando Signed URL para: ${fileName}`);
      
      const signUrl = `${baseUrl}/storage/v1/object/sign/assets/${fileName}`;
      
      const res = await fetch(signUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": signingKey,
          "Authorization": `Bearer ${signingKey}`,
        },
        body: JSON.stringify({ expiresIn: 604800 }), // 7 dias
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[VideoAuth] CRÍTICO: Falha ao assinar no servidor (${res.status}):`, errText);
        // NUNCA retorne /public/ ou /authenticated/ aqui se for vídeo do bucket assets.
        // O navegador bloqueia o player se a URL não for assinada e o bucket for privado.
        return { url: "", error: `SIGN_SERVER_ERROR_${res.status}` as const };
      }

      const json = await res.json();
      const signedPath = json.signedURL || json.signedUrl;

      if (!signedPath) {
        return { url: "", error: "SIGNED_URL_EMPTY" as const };
      }

      let finalUrl = signedPath;
      if (!signedPath.startsWith("http")) {
        finalUrl = `${baseUrl}/storage/v1${signedPath}`;
      }

      return { url: finalUrl };
    } catch (err) {
      console.error("[VideoAuth] Exception fatal:", err);
      return { url: "", error: "SIGN_EXCEPTION" as const };
    }
  });
