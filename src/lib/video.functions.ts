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
    fileName = fileName.split('?')[0];

    const publicUrl = `${baseUrl}/storage/v1/object/public/assets/${fileName || ""}`;

    // Tenta capturar a chave administrativa para gerar URL assinada (privada)
    const adminKey = 
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
      process.env['VITE_SUPABASE_SERVICE_ROLE_KEY'];

    if (!adminKey || adminKey === "NO_KEY_PROVIDED") {
      console.log(`[VideoAuth] Usando URL pública (sem chave): ${fileName}`);
      return { url: publicUrl };
    }

    try {
      console.log(`[VideoAuth] Assinando vídeo: ${fileName}`);
      
      // O endpoint de assinatura do Supabase Storage
      const signUrl = `${baseUrl}/storage/v1/object/sign/assets/${fileName}`;
      
      const res = await fetch(signUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": adminKey,
          "Authorization": `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ expiresIn: 86400 }), // 24h
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[VideoAuth] Erro ao assinar (${res.status}):`, errText);
        // Fallback agressivo para a URL pública em caso de erro 400/403/404 na assinatura
        return { url: publicUrl };
      }

      const json = await res.json();
      const signedPath = json.signedURL || json.signedUrl;

      if (!signedPath) {
        console.error("[VideoAuth] signedURL não encontrada na resposta");
        return { url: publicUrl };
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
      return { url: publicUrl };
    }
  });
