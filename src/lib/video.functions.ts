import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getSignedVideoUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { data: signedData, error } = await supabaseAdmin.storage
      .from('assets')
      .createSignedUrl(data.path, 86400); // 24 hours to help with caching/persistence

    if (error) {
      console.error("Error creating signed URL:", error);
      throw new Error("Could not generate secure video link");
    }

    return { url: signedData.signedUrl };
  });
