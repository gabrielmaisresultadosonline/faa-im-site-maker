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
    const { userId } = context;
    
    // Importa dinamicamente o client admin para garantir bypass de RLS
    // Isso evita o erro "Não foi possível ativar o teste" causado por falta de políticas de INSERT em subscriptions
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = getSupabaseAdmin();

    console.log(`[Trial] Iniciando ativação para usuário: ${userId}`);

    // Busca assinaturas existentes
    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("id, status, expires_at, type")
      .eq("user_id", userId);

    if (existingError) {
      console.error("[Trial] Erro ao buscar assinaturas:", existingError);
      throw new Error("Could not verify the account status");
    }

    // Verifica se já existe um trial ou assinatura ativa
    if (existing && existing.length > 0) {
      const trials = existing.filter(s => s.type === 'trial');
      const activePaid = existing.filter(s => s.type !== 'trial' && s.status === 'active');

      // Se já teve um trial no passado, bloqueia (limite de 1 por conta)
      if (trials.length > 0) {
        console.warn(`[Trial] Usuário ${userId} já utilizou um teste anteriormente.`);
        throw new Error("TRIAL_ALREADY_USED");
      }

      // Se tem uma assinatura paga ativa, não faz sentido ativar trial
      if (activePaid.length > 0) {
        const isExpired = activePaid.some(s => s.expires_at && new Date(s.expires_at) < new Date());
        if (!isExpired) {
          console.warn(`[Trial] Usuário ${userId} já possui assinatura paga ativa.`);
          throw new Error("TRIAL_ALREADY_USED");
        }
      }
    }

    // Gera ou recupera senha de acesso
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("access_password")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[Trial] Erro ao buscar perfil:", profileError);
    }

    const accessPassword = profile?.access_password || generateAccessPassword();

    // Atualiza o perfil com a senha (garante que tenha uma)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ access_password: accessPassword })
      .eq("id", userId);

    if (updateError) {
      console.error("[Trial] Erro ao atualizar perfil:", updateError);
    }

    // Define expiração: 20 minutos a partir de agora
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Cria a assinatura de teste
    const { error: insertError } = await supabase.from("subscriptions").insert({
      user_id: userId,
      type: "trial",
      status: "active",
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("[Trial] Falha crítica ao inserir assinatura:", insertError);
      throw new Error("Could not activate the trial");
    }

    console.log(`[Trial] Sucesso! Expira em: ${expiresAt}`);
    return { expiresAt, accessPassword };
  });
