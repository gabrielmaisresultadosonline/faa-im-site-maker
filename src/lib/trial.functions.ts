import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateAccessPassword } from "@/lib/access-code";
import { z } from "zod";

/**
 * Ativa o teste gratuito de 20 minutos para o usuario autenticado.
 * Regras defensivas:
 * - Cada conta pode gerar o teste UMA unica vez (se ja existe qualquer assinatura, recusa).
 * - A senha de acesso da extensao e gerada no servidor e salva no perfil.
 */
export const startTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => data) // Mantém compatibilidade com a chamada sem data
  .handler(async ({ context }) => {
    // Usamos o context injetado pelo middleware que já validou o token JWT
    const { userId } = context;
    
    // Importa dinamicamente o client admin para garantir bypass de RLS
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = getSupabaseAdmin();

    console.log(`[Trial] Iniciando ativação administrativa para usuário: ${userId}`);

    // Busca assinaturas existentes
    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("id, status, expires_at, type")
      .eq("user_id", userId);

    if (existingError) {
      console.error("[Trial] Erro ao buscar assinaturas:", existingError);
      throw new Error("DATABASE_ERROR");
    }

    // Verifica se já existe um trial ou assinatura ativa
    if (existing && existing.length > 0) {
      const trials = existing.filter(s => s.type === 'trial');
      const activePaid = existing.filter(s => s.type !== 'trial' && s.status === 'active');

      if (trials.length > 0) {
        console.warn(`[Trial] Usuário ${userId} já utilizou um teste anteriormente.`);
        throw new Error("TRIAL_ALREADY_USED");
      }

      if (activePaid.length > 0) {
        const isExpired = activePaid.some(s => s.expires_at && new Date(s.expires_at) < new Date());
        if (!isExpired) {
          console.warn(`[Trial] Usuário ${userId} já possui assinatura paga ativa.`);
          throw new Error("TRIAL_ALREADY_USED");
        }
      }
    }

    // Define expiração: 20 minutos a partir de agora
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // 1) Garante que o perfil tenha uma senha de acesso
    const { data: profile } = await supabase.from("profiles").select("access_password").eq("id", userId).maybeSingle();
    const accessPassword = profile?.access_password || generateAccessPassword();

    // 2) Tenta criar a assinatura e atualizar o perfil em paralelo (bypass RLS)
    const [subRes, profileRes] = await Promise.all([
      supabase.from("subscriptions").insert({
        user_id: userId,
        type: "trial",
        status: "active",
        expires_at: expiresAt,
      }),
      supabase.from("profiles").update({ access_password: accessPassword }).eq("id", userId)
    ]);

    if (subRes.error) {
      console.error("[Trial] Falha crítica ao inserir assinatura:", subRes.error);
      throw new Error("INSERT_FAILED");
    }

    console.log(`[Trial] Sucesso! Expira em: ${expiresAt}`);
    return { expiresAt, accessPassword };
  });