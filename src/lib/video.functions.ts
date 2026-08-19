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
    const publicUrl = `${publicDomain}/storage/v1/object/public/assets/${pathClean}`;

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
      // Usamos a URL base para a chamada interna
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
      // IMPORTANTE: Se o baseUrl for interno (como 127.0.0.1 ou o host da Supabase), 
      // precisamos garantir que o navegador consiga acessar.
      let finalUrl = signedPath.startsWith('http') 
        ? signedPath 
        : `${baseUrl}/storage/v1${signedPath}`;
      
      // NORMALIZAÇÃO AGRESSIVA PARA VPS:
      // Substituímos o host de QUALQUER URL gerada pelo domínio público lovblack.online
      // Isso garante que o navegador peça o vídeo para o servidor Nginx da VPS que sabe rotear.
      // Se finalUrl for https://zjvmfmdyuxmyanuuralq.supabase.co/..., 
      // o navegador do usuário pode ser bloqueado por CORS ou rede.
      // Ao trocar para lovblack.online/..., o Nginx/Nitro atua como proxy.
      
      console.log(`[Video] URL Antes da normalização: ${finalUrl}`);
      
      // Regex para substituir o esquema e host pelo publicDomain
      finalUrl = finalUrl.replace(/https?:\/\/[^\/]+/, publicDomain);

      console.log(`[Video] URL Final normalizada para VPS: ${finalUrl}`);
      return { url: finalUrl };
    } catch (error) {
      console.error("[Video] Falha crítica na assinatura, usando fallback público:", error);
      // Até o fallback público precisa ser normalizado
      return { url: publicUrl };
    }
  });
