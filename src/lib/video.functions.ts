import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getSignedVideoUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data }) => {
    console.log(`[Video] Iniciando assinatura para: ${data.path}`);

    // URL base do Supabase
    const baseUrl =
      process.env['SUPABASE_URL'] ||
      process.env['VITE_SUPABASE_URL'] ||
      "https://zjvmfmdyuxmyanuuralq.supabase.co";

    // Domínio público final do usuário (para correção de localhost)
    const publicDomain = "https://lovblack.online";

    const pathClean = data.path.replace(/^\/+/, '');
    const publicUrl = `${baseUrl}/storage/v1/object/public/assets/${pathClean}`;

    // Captura a Service Key
    const serviceKey = 
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
      process.env['VITE_SUPABASE_SERVICE_ROLE_KEY'] ||
      process.env['sb_secret_zjvmfmdyuxmyanuuralq'];

    if (!serviceKey || serviceKey === "NO_KEY_PROVIDED") {
      console.warn("[Video] Sem SERVICE_ROLE_KEY, usando URL pública.");
      return { url: publicUrl };
    }

    try {
      // Usamos a URL base para a chamada interna, mas normalizamos o retorno para o domínio público
      const signEndpoint = `${baseUrl}/storage/v1/object/sign/assets/${pathClean}`;
      
      const res = await fetch(
        signEndpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: serviceKey.startsWith('sb_') ? serviceKey : `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ expiresIn: 86400 }), // 24h
        },
      );

      if (!res.ok) {
        console.error(`[Video] Erro na API de assinatura (${res.status}):`, await res.text());
        return { url: publicUrl };
      }

      const json = (await res.json()) as { signedURL?: string; signedUrl?: string };
      const signedPath = json.signedURL || json.signedUrl;

      if (!signedPath) return { url: publicUrl };

      // Se o retorno for relativo, anexa ao baseUrl
      let finalUrl = signedPath.startsWith('http') 
        ? signedPath 
        : `${baseUrl}/storage/v1${signedPath}`;
      
      // CORREÇÃO DEFINITIVA PARA VPS:
      // Se a URL contiver 'localhost', '127.0.0.1' ou a URL base do Supabase (que pode ser interna),
      // forçamos para o domínio público lovblack.online para que o navegador consiga acessar.
      // Isso resolve o problema de "vídeo quebrado" ou que não carrega no domínio direto.
      if (finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1') || finalUrl.includes('::1')) {
        console.log(`[Video] Detectado host local na URL assinada, corrigindo para ${publicDomain}`);
        finalUrl = finalUrl.replace(/https?:\/\/[^\/]+/, publicDomain);
      }

      console.log(`[Video] URL Final gerada com sucesso: ${finalUrl}`);
      return { url: finalUrl };
    } catch (error) {
      console.error("[Video] Falha crítica na assinatura, usando fallback público:", error);
      return { url: publicUrl };
    }
  });
