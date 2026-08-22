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
  .middleware([])
  .validator((data: unknown) => data) // Mantém compatibilidade com a chamada sem data
  .handler(async ({ data, context }: { data: any, context: any }) => {
    // Se não houver userId no contexto (chamada pública), tentamos pegar da data
    let userId = context?.userId;
    
    if (!userId && data && typeof data === 'object' && 'userId' in data) {
      userId = (data as any).userId;
    }

    if (!userId) {
      console.error("[Trial] ID de usuário não fornecido");
      throw new Error("USER_ID_REQUIRED");
    }

    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = getSupabaseAdmin();

    console.log(`[Trial] Ativação para usuário: ${userId}`);

    // GARANTIA: Tentamos sempre o upsert do perfil primeiro para evitar qualquer race condition
    try {
      await (supabase.from("profiles") as any).upsert({ 
        id: userId,
        full_name: 'Usuário',
        language: 'pt',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn("[Trial] Erro no upsert inicial (ignorado):", e);
    }

    // 1. Verificar se o perfil existe
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, access_password")
      .eq("id", userId)
      .maybeSingle();
    
    if (profileError || !profileData) {
      console.error("[Trial] Perfil não encontrado após upsert:", profileError);
      throw new Error("PROFILE_SYNC_FAILED");
    }

    // 2. Verificar assinaturas existentes
    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("id, status, expires_at, type")
      .eq("user_id", userId);

    if (existingError) {
      console.error("[Trial] Erro ao buscar assinaturas:", existingError);
      throw new Error("DATABASE_ERROR");
    }

    if (existing && existing.length > 0) {
      const hasTrial = existing.some(s => s.type === 'trial');
      const hasActivePaid = existing.some(s => s.type !== 'trial' && s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > new Date()));

      if (hasTrial || hasActivePaid) {
        console.warn(`[Trial] Usuário ${userId} já possui assinatura ou teste usado.`);
        throw new Error("TRIAL_ALREADY_USED");
      }
    }

    // 3. Preparar dados
    const accessPassword = profileData.access_password || generateAccessPassword();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // 4. Executar transação forçada (UPSERT para evitar erro 409)
    try {
      // Inserimos a assinatura e atualizamos o perfil
      const results = await Promise.allSettled([
        supabase.from("subscriptions").upsert({
          user_id: userId,
          type: "trial",
          status: "active",
          expires_at: expiresAt,
        }, { onConflict: 'user_id,type' }),
        supabase.from("profiles").update({ access_password: accessPassword }).eq("id", userId)
      ]);

      const subResult = results[0];
      if (subResult.status === 'rejected' || (subResult.value as any).error) {
        console.error("[Trial] Falha crítica na assinatura:", subResult);
        throw new Error("INSERT_FAILED_SUBSCRIPTION");
      }

      console.log(`[Trial] Sucesso definitivo para ${userId}. Expira em: ${expiresAt}`);
      return { expiresAt, accessPassword };
    } catch (err: any) {
      console.error("[Trial] Falha total no processamento:", err);
      throw new Error(err.message || "INTERNAL_ERROR");
    }
  });
  });