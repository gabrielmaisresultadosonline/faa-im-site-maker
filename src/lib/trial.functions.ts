import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("activate_free_trial");

    if (error) {
      console.error("[Trial] Falha na ativação autenticada:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(error.message || "TRIAL_ACTIVATION_FAILED");
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("TRIAL_ACTIVATION_INVALID_RESPONSE");
    }

    return {
      expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : "",
      accessPassword:
        typeof data.accessPassword === "string" ? data.accessPassword : "",
    };
  });