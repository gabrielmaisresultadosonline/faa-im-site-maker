import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateAccessPassword } from "@/lib/access-code";

/**
 * Ativa o teste gratuito de 20 minutos para o usuario autenticado.
 * Regras defensivas:
 * - Cada conta pode gerar o teste UMA unica vez (se ja existe qualquer assinatura, recusa).
 * - A senha de acesso da extensao e gerada no servidor e salva no perfil.
 */
export const startTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;


    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("id, status, expires_at")
      .eq("user_id", userId)
      .limit(1);

    if (existingError) {
      console.error("startTrial: failed to read subscriptions", existingError);
      throw new Error("Could not verify the account status");
    }

    if (existing && existing.length > 0) {
      const sub = existing[0];
      if (sub && sub.status === 'active' && sub.expires_at && new Date(sub.expires_at) > new Date()) {
        throw new Error("TRIAL_ALREADY_USED");
      }
      throw new Error("TRIAL_ALREADY_USED");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("access_password")
      .eq("id", userId)
      .maybeSingle();

    const accessPassword =
      (profile as { access_password?: string | null } | null)?.access_password ||
      generateAccessPassword();

    await supabase

      .from("profiles")
      .update({ access_password: accessPassword })
      .eq("id", userId);

    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("subscriptions").insert({
      user_id: userId,
      type: "trial",
      status: "active",
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("startTrial: failed to create trial", insertError);
      throw new Error("Could not activate the trial");
    }

    return { expiresAt, accessPassword };
  });
