import { createServerFn } from "@tanstack/react-start";
import { generateAccessPassword } from "@/lib/access-code";

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
    console.log("[Trial] Handler iniciado", { context, data });
    
    // Se não houver userId no contexto (chamada pública), tentamos pegar da data
    let userId = context?.userId;
    
    if (!userId && data && typeof data === 'object' && 'userId' in data) {
      userId = (data as any).userId;
      console.log("[Trial] UserId recuperado da data:", userId);
    }

    if (!userId) {
      console.error("[Trial] ID de usuário não fornecido ou encontrado no contexto");
      throw new Error("USER_ID_REQUIRED");
    }

    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = getSupabaseAdmin();

    console.log(`[Trial] Ativação para usuário: ${userId}`);

    // 1. GARANTIA: Tentamos sempre o upsert do perfil primeiro para evitar qualquer race condition
    try {
      console.log(`[Trial] Forçando upsert do perfil para ${userId}`);
      const profileToUpsert = { 
        id: userId,
        updated_at: new Date().toISOString()
      };
      console.log("[Trial] Dados do perfil para upsert:", profileToUpsert);
      
      const { data: upsertData, error: upsertError } = await (supabase.from("profiles") as any).upsert(profileToUpsert, { onConflict: 'id' }).select();
      
      if (upsertError) {
        console.error("[Trial] Erro no upsert inicial:", upsertError);
      } else {
        console.log("[Trial] Upsert inicial concluído com sucesso:", upsertData);
      }
    } catch (e) {
      console.error("[Trial] Exceção crítica no upsert inicial:", e);
    }

    // 2. Verificar se o perfil existe e buscar dados necessários
    console.log(`[Trial] Buscando perfil final para ${userId}`);
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, access_password")
      .eq("id", userId)
      .maybeSingle();
    
    if (profileError) {
      console.error("[Trial] Erro ao buscar perfil:", profileError);
    }
    
    // Se ainda não existir, tentamos uma última vez criar o perfil básico
    if (!profileData) {
      console.log(`[Trial] Perfil não encontrado após upsert, tentando insert direto...`);
      const { data: retryData, error: retryError } = await supabase
        .from("profiles")
        .insert({ id: userId })
        .select()
        .single();
      
      if (retryError) {
        console.error("[Trial] Falha crítica no insert de emergência:", retryError);
        // Não jogamos erro aqui se o erro for de duplicidade, pois o importante é a assinatura
        if (!retryError.message.includes("duplicate")) {
           throw new Error(`PROFILE_CREATION_FAILED: ${retryError.message}`);
        }
      } else {
        console.log("[Trial] Insert de emergência concluído:", retryData);
      }
    } else {
      console.log("[Trial] Perfil encontrado:", profileData);
    }

    // 3. Verificar assinaturas existentes
    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("id, status, expires_at, type")
      .eq("user_id", userId);

    if (existingError) {
      console.error("[Trial] Erro ao buscar assinaturas:", existingError);
      throw new Error("DATABASE_READ_ERROR");
    }

    if (existing && existing.length > 0) {
      const hasTrial = existing.some(s => s.type === 'trial');
      const hasActivePaid = existing.some(s => s.type !== 'trial' && s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > new Date()));

      if (hasTrial || hasActivePaid) {
        console.warn(`[Trial] Usuário ${userId} já possui assinatura ou teste usado.`);
        throw new Error("TRIAL_ALREADY_USED");
      }
    }

    // 4. Preparar dados
    const finalAccessPassword = profileData?.access_password || generateAccessPassword();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // 5. Executar transação forçada (UPSERT para evitar erro 409)
    try {
      console.log(`[Trial] Iniciando upsert de assinatura para ${userId}`);
      // Usamos uma abordagem sequencial para maior confiabilidade no Supabase Admin
      const { error: subErr } = await supabase.from("subscriptions").upsert({
        user_id: userId,
        type: "trial",
        status: "active",
        expires_at: expiresAt,
      }, { onConflict: 'user_id,type' });

      if (subErr) {
        console.error("[Trial] Erro no upsert de assinatura:", subErr);
        throw subErr;
      }

      console.log(`[Trial] Assinatura criada, atualizando senha do perfil para ${userId}`);
      const { error: profErr } = await supabase.from("profiles")
        .update({ access_password: finalAccessPassword })
        .eq("id", userId);
      
      if (profErr) {
        console.warn("[Trial] Erro ao atualizar senha no perfil (não fatal):", profErr);
      }

      console.log(`[Trial] Sucesso definitivo para ${userId}. Expira em: ${expiresAt}`);
      return { expiresAt, accessPassword: finalAccessPassword };
    } catch (err: any) {
      console.error("[Trial] Falha total no processamento da ativação:", err);
      throw new Error(err.message || "INTERNAL_ERROR");
    }
  });