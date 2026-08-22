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

    // Normaliza o path
    let fileName = data.path.replace(/^\/+/, "").replace(/^assets\//, "");
    
    // Se vier uma URL completa, extraímos apenas o nome do arquivo
    if (fileName.includes("supabase.co")) {
      fileName = fileName.split("/").pop() || fileName;
    }

    // Remove qualquer query parameter (ex: ?t=...)
    fileName = fileName.split('?')[0] || "";

    if (!fileName) {
      throw new Error("INVALID_VIDEO_PATH");
    }

    // O bucket assets é privado. A chave pública consegue assinar os vídeos
    // permitidos pela política de leitura e funciona também no VPS sem chave administrativa.
    const signingKey =
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
      process.env['VITE_SUPABASE_SERVICE_ROLE_KEY'] ||
      process.env['SUPABASE_PUBLISHABLE_KEY'] ||
      process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
      import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
      "sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7";

    try {
      console.log(`[VideoAuth] Assinando vídeo: ${fileName}`);
      
      // O endpoint de assinatura do Supabase Storage
      const signUrl = `${baseUrl}/storage/v1/object/sign/assets/${fileName}`;
      
      const res = await fetch(signUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": signingKey,
          ...(signingKey.startsWith("sb_secret_")
            ? {}
            : { "Authorization": `Bearer ${signingKey}` }),
        },
        body: JSON.stringify({ expiresIn: 86400 }), // 24h
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[VideoAuth] Erro ao assinar (${res.status}):`, errText);
        throw new Error(`VIDEO_SIGN_FAILED_${res.status}`);
      }

      const json = await res.json();
      const signedPath = json.signedURL || json.signedUrl;

      if (!signedPath) {
        console.error("[VideoAuth] signedURL não encontrada na resposta");
        throw new Error("VIDEO_SIGN_URL_MISSING");
      }

      // Constrói a URL final garantindo o host correto
      let finalUrl = signedPath;
      if (!signedPath.startsWith("http")) {
        finalUrl = `${baseUrl}/storage/v1${signedPath}`;
      }

      console.log(`[VideoAuth] Sucesso: ${finalUrl.slice(0, 50)}...`);
      return { url: finalUrl };
    } catch (err) {
      console.error("[VideoAuth] Falha crítica na assinatura:", err);
      throw err instanceof Error ? err : new Error("VIDEO_SIGN_FAILED");
    }
  });
