import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getSignedVideoUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const baseUrl =
      process.env['VITE_SUPABASE_URL'] ||
      process.env['SUPABASE_URL'] ||
      "https://zjvmfmdyuxmyanuuralq.supabase.co";

    const pathClean = data.path.replace(/^\/+/, '');
    const publicUrl = `${baseUrl}/storage/v1/object/public/assets/${pathClean}`;

    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['VITE_SUPABASE_SERVICE_ROLE_KEY'];
    if (!serviceKey) {
      return { url: publicUrl };
    }

    try {
      const res = await fetch(
        `${baseUrl}/storage/v1/object/sign/assets/${pathClean}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ expiresIn: 86400 }),
        },
      );

      if (!res.ok) {
        console.error(`Sign error ${res.status}:`, await res.text());
        return { url: publicUrl };
      }

      const json = (await res.json()) as { signedURL?: string };
      if (!json.signedURL) return { url: publicUrl };

      // O signedURL retornado pode ser relativo ou absoluto dependendo da versão da API
      const finalUrl = json.signedURL.startsWith('http') 
        ? json.signedURL 
        : `${baseUrl}/storage/v1${json.signedURL}`;

      return { url: finalUrl };
    } catch (error) {
      console.error("Signed URL failed, falling back to public URL:", error);
      return { url: publicUrl };
    }
  });
