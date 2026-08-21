import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Gera a URL de reprodução de um vídeo armazenado no bucket "assets".
 *
 * IMPORTANTE: a URL retornada precisa apontar SEMPRE para o host do backend
 * (Supabase Storage). Reescrever o host para o domínio do site quebra a
 * reprodução, pois o Nginx da VPS não faz proxy de /storage/v1/*.
 */
export const getSignedVideoUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const baseUrl = (
      process.env['SUPABASE_URL'] ||
      process.env['VITE_SUPABASE_URL'] ||
      "https://zjvmfmdyuxmyanuuralq.supabase.co"
    ).replace(/\/+$/, "");

    // Normaliza o path: aceita filename, path relativo ou URL completa
    let finalPath = data.path.replace(/^\/+/, "");
    if (/^https?:\/\//i.test(finalPath)) {
      try {
        const parsed = new URL(finalPath);
        const marker = "/assets/";
        const idx = parsed.pathname.indexOf(marker);
        finalPath =
          idx >= 0
            ? parsed.pathname.slice(idx + marker.length)
            : parsed.pathname.split("/").pop() || finalPath;
      } catch {
        // mantém o valor original
      }
    }
    finalPath = finalPath.replace(/^assets\//, "");

    const publicUrl = `${baseUrl}/storage/v1/object/public/assets/${finalPath}`;

    // O bucket "assets" é privado, mas possui policy de SELECT pública,
    // então a chave publicável já basta para assinar a URL do vídeo.
    const serviceKey =
      process.env['SUPABASE_SERVICE_ROLE_KEY'] ||
      process.env['VITE_SUPABASE_SERVICE_ROLE_KEY'] ||
      process.env['SUPABASE_PUBLISHABLE_KEY'] ||
      process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
      "sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7";

    if (!serviceKey || serviceKey === "NO_KEY_PROVIDED") {
      return { url: publicUrl };
    }


    try {
      const res = await fetch(
        `${baseUrl}/storage/v1/object/sign/assets/${finalPath}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: serviceKey.startsWith("sb_")
              ? serviceKey
              : `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ expiresIn: 86400 }),
        },
      );

      if (!res.ok) return { url: publicUrl };

      const json = (await res.json()) as {
        signedURL?: string;
        signedUrl?: string;
      };
      const signedPath = json.signedURL || json.signedUrl;
      if (!signedPath) return { url: publicUrl };

      const finalUrl = signedPath.startsWith("http")
        ? signedPath
        : `${baseUrl}/storage/v1${signedPath.replace(/^\/storage\/v1/, "")}`;

      // Garante que o host seja o do backend público (nunca localhost/127.0.0.1)
      try {
        const u = new URL(finalUrl);
        if (["127.0.0.1", "localhost", "::1"].includes(u.hostname)) {
          return { url: finalUrl.replace(u.origin, baseUrl) };
        }
      } catch {
        // ignora
      }

      return { url: finalUrl };
    } catch {
      return { url: publicUrl };
    }
  });
