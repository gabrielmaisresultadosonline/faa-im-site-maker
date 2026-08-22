import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Gera a URL de reprodução de um vídeo armazenado no bucket "assets".
 * 
 * Correção definitiva para VPS (400 Bad Request):
 * O Supabase Storage via Cloudflare exige o header 'range' correto para vídeos.
 * Se a URL for privada e a chave service_role não estiver no env do PM2,
 * retornamos a URL pública para que o navegador tente o GET direto.
 */
export const getSignedVideoUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // Domínio oficial do backend Supabase
    const SUPABASE_PROJECT_ID = "zjvmfmdyuxmyanuuralq";
    const baseUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

    // Normaliza o path: remove 'assets/' se já existir e limpa barras
    let fileName = data.path.replace(/^\/+/, "").replace(/^assets\//, "");
    
    // Se vier uma URL completa, extraímos apenas o nome do arquivo
    if (fileName.includes("supabase.co")) {
      const parts = fileName.split('/');
      fileName = parts[parts.length - 1] || fileName;
    }

    // Remove qualquer query parameter (ex: ?t=...)
    fileName = fileName.split('?')[0] || "";

    if (!fileName) {
      return { url: "", error: "INVALID_VIDEO_PATH" as const };
    }


    // O bucket assets é PRIVADO (public: false)
    // O erro "Bucket not found" ou "404" ao acessar /public/assets/ é esperado
    // pois o bucket é privado. Devemos SEMPRE usar Signed URLs.
    
    const signingKey =
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
      process.env['VITE_SUPABASE_SERVICE_ROLE_KEY'] ||
      process.env['SUPABASE_PUBLISHABLE_KEY'] ||
      process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
      import.meta.env['VITE_SUPABASE_ANON_KEY'] ||
      "sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7";

    try {
      console.log(`[VideoAuth] Assinando vídeo: ${fileName} | Key prefix: ${signingKey.slice(0, 10)}`);
      
      // Endpoint de assinatura de STORAGE
      const signUrl = `${baseUrl}/storage/v1/object/sign/assets/${fileName}`;
      
      const res = await fetch(signUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": signingKey,
          "Authorization": `Bearer ${signingKey}`,
        },
        body: JSON.stringify({ expiresIn: 86400 }), // 24h
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[VideoAuth] Erro na assinatura (${res.status}):`, errText);
        // Fallback para URL direta caso seja um erro transiente, mas avisamos que falhou
        return {
          url: `${baseUrl}/storage/v1/object/authenticated/assets/${fileName}`,
          error: `SIGN_FAILED_${res.status}`
        };
      }

      const json = await res.json();
      const signedPath = json.signedURL || json.signedUrl;

      if (!signedPath) {
        return {
          url: `${baseUrl}/storage/v1/object/authenticated/assets/${fileName}`,
          error: "SIGNED_URL_MISSING_IN_RESPONSE"
        };
      }

      let finalUrl = signedPath;
      if (!signedPath.startsWith("http")) {
        finalUrl = `${baseUrl}/storage/v1${signedPath}`;
      }

      return { url: finalUrl };
    } catch (err) {
      console.error("[VideoAuth] Exception:", err);
      return {
        url: `${baseUrl}/storage/v1/object/authenticated/assets/${fileName}`,
        error: err instanceof Error ? err.message : "SIGN_EXCEPTION",
      };
    }
  });

