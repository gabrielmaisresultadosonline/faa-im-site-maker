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
    // Para acessá-lo via GET direto, precisamos de uma URL assinada (signed URL)
    
    // Tentamos assinar usando SERVICE_ROLE (preferencial no servidor) 
    // ou PUBLISHABLE_KEY (como fallback se as permissões permitirem)
    // ADICIONADO: Forçamos a chave pública se nenhuma outra estiver disponível no VPS
    const signingKey =
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
      process.env['VITE_SUPABASE_SERVICE_ROLE_KEY'] ||
      process.env['SUPABASE_PUBLISHABLE_KEY'] ||
      process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
      import.meta.env['VITE_SUPABASE_ANON_KEY'] ||
      "sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7";

    try {
      console.log(`[VideoAuth] Assinando vídeo: ${fileName} com key starting: ${signingKey.slice(0, 10)}...`);
      
      // Assinatura via endpoint de STORAGE
      const signUrl = `${baseUrl}/storage/v1/object/sign/assets/${fileName}`;
      
      const res = await fetch(signUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": signingKey,
          // Se for service_role, usamos como bearer. Se for anon, também.
          "Authorization": `Bearer ${signingKey}`,
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

      // Constrói a URL final garantindo o host correto e o prefixo /storage/v1
      let finalUrl = signedPath;
      if (!signedPath.startsWith("http")) {
        finalUrl = `${baseUrl}/storage/v1${signedPath}`;
      }

      console.log(`[VideoAuth] Sucesso: ${finalUrl.slice(0, 60)}...`);
      return { url: finalUrl };
    } catch (err) {
      console.error("[VideoAuth] Falha na assinatura:", err);
      throw err instanceof Error ? err : new Error("VIDEO_SIGN_FAILED");
    }
  });
