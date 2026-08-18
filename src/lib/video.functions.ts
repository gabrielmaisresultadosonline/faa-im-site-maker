import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getSignedVideoUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data }) => {
    console.log(`[Video] Sign request for ${data.path}`);

    // Tentativa robusta de obter a URL base
    const baseUrl =
      process.env['SUPABASE_URL'] ||
      process.env['VITE_SUPABASE_URL'] ||
      "https://zjvmfmdyuxmyanuuralq.supabase.co";

    const pathClean = data.path.replace(/^\/+/, '');
    
    // URL pública como fallback principal
    const publicUrl = `${baseUrl}/storage/v1/object/public/assets/${pathClean}`;

    // Tentativa de obter a Service Key (Prioridade para env var injetada pelo PM2/Nitro)
    const serviceKey = 
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
      process.env['VITE_SUPABASE_SERVICE_ROLE_KEY'] ||
      process.env['sb_secret_zjvmfmdyuxmyanuuralq'];

    console.log(`[Video] Base URL detected: ${baseUrl}`);
    console.log(`[Video] Service Key present: ${!!serviceKey && serviceKey !== "NO_KEY_PROVIDED"}`);

    if (!serviceKey || serviceKey === "NO_KEY_PROVIDED") {
      console.warn("[Video] No service key found, returning public URL.");
      return { url: publicUrl };
    }

    try {
      const signEndpoint = `${baseUrl}/storage/v1/object/sign/assets/${pathClean}`;
      console.log(`[Video] Requesting sign from: ${signEndpoint}`);

      const res = await fetch(
        signEndpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: serviceKey.startsWith('sb_') ? serviceKey : `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ expiresIn: 86400 }),
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Video] Sign API error ${res.status}:`, errorText);
        // Se for erro de permissão ou 404, o fallback público é a melhor opção
        return { url: publicUrl };
      }

      const json = (await res.json()) as { signedURL?: string; signedUrl?: string };
      const signedPart = json.signedURL || json.signedUrl;

      if (!signedPart) {
        console.warn("[Video] No signedURL in response, using public fallback.");
        return { url: publicUrl };
      }

      // Constrói a URL final garantindo que seja absoluta
      let finalUrl = signedPart.startsWith('http') 
        ? signedPart 
        : `${baseUrl}/storage/v1${signedPart}`;
      
      // NORMALIZAÇÃO CRÍTICA PARA VPS:
      // O Supabase interno (se estiver no mesmo host) pode retornar URLs com localhost/127.0.0.1.
      // O navegador do usuário NÃO consegue acessar isso. Substituímos pelo domínio público.
      if (finalUrl.includes('127.0.0.1') || finalUrl.includes('localhost') || finalUrl.includes('::1')) {
        console.log(`[Video] Localhost detected in signed URL (${finalUrl}), rewriting to ${baseUrl}`);
        finalUrl = finalUrl.replace(/https?:\/\/[^\/]+/, baseUrl);
      }

      console.log(`[Video] Success! Final access URL: ${finalUrl}`);
      return { url: finalUrl };
    } catch (error) {
      console.error("[Video] Critical failure in signing, falling back to public URL:", error);
      return { url: publicUrl };
    }
  });
