import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getSignedVideoUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const baseUrl =
      process.env['VITE_SUPABASE_URL'] ||
      process.env['SUPABASE_URL'] ||
      "https://zjvmfmdyuxmyanuuralq.supabase.co";

    const publicUrl = `${baseUrl}/storage/v1/object/public/assets/${data.path}`;

    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!serviceKey) {
      console.warn("SUPABASE_SERVICE_ROLE_KEY not found in server function, falling back to public URL.");
      return { url: publicUrl };
    }

    try {
      const res = await fetch(
        `${baseUrl}/storage/v1/object/sign/assets/${data.path}`,
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

      if (!res.ok) return { url: publicUrl };

      const json = (await res.json()) as { signedURL?: string };
      if (!json.signedURL) return { url: publicUrl };

      return { url: `${baseUrl}/storage/v1${json.signedURL}` };
    } catch (error) {
      console.error("Signed URL failed, falling back to public URL:", error);
      return { url: publicUrl };
    }
  });
