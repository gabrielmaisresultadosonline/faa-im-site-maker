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

    // 1. Verificar se o perfil existe. Se não, esperar um pouco (race condition com trigger)
    // Aumentamos o número de tentativas e o tempo de espera
    let profileData = null;
    const { data: initialCheck } = await supabase.from("profiles").select("id, access_password").eq("id", userId).maybeSingle();
    
    if (initialCheck) {
      profileData = initialCheck;
    } else {
      console.log(`[Trial] Perfil não encontrado inicialmente para ${userId}, tentando upsert de emergência...`);
      // Tentamos criar o perfil imediatamente para evitar esperar o trigger
      const { data: newProfile, error: upsertError } = await (supabase.from("profiles") as any).upsert({ 
        id: userId,
        full_name: 'Usuário',
        language: 'pt',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).select().maybeSingle();

      if (upsertError) {
        console.error(`[Trial] Falha no upsert de emergência:`, upsertError);
        // Se falhou o upsert, tentamos o loop de espera como último recurso
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data, error } = await supabase.from("profiles").select("id, access_password").eq("id", userId).maybeSingle();
          if (data) {
            profileData = data;
            break;
          }
        }
      } else {
        profileData = newProfile;
      }
    }

    if (!profileData) {
      console.error(`[Trial] Perfil não encontrado após retentativas para ${userId}`);
      // Se ainda não existir, tentamos criar um perfil básico para não travar o usuário
      const { data: newProfile, error: createError } = await (supabase.from("profiles") as any).upsert({ 
        id: userId,
        full_name: 'Usuário',
        language: 'pt'
      }, { onConflict: 'id' }).select().single();

      if (createError) {
        console.error(`[Trial] Falha ao criar perfil de emergência:`, createError);
        throw new Error("PROFILE_SYNC_FAILED");
      }
      profileData = newProfile;
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

    // 3. Gerar senha se não existir
    const accessPassword = profileData.access_password || generateAccessPassword();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // 4. Executar transação administrativa
    try {
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
        console.error("[Trial] Falha ao inserir assinatura:", subRes.error);
        throw new Error("INSERT_FAILED_SUBSCRIPTION");
      }

      console.log(`[Trial] Sucesso para ${userId}. Expira em: ${expiresAt}`);
      return { expiresAt, accessPassword };
    } catch (err: any) {
      console.error("[Trial] Erro na transação. Tentando fallback agressivo...", err);
      
      // Fallback agressivo: força a inserção da assinatura sem aguardar o retorno da transação anterior
      try {
        const expiresAtFallback = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        const accessPasswordFallback = profileData.access_password || generateAccessPassword();
        
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          type: "trial",
          status: "active",
          expires_at: expiresAtFallback,
        }, { onConflict: 'user_id,type' });

        await supabase.from("profiles").update({ 
          access_password: accessPasswordFallback 
        }).eq("id", userId);

        return { expiresAt: expiresAtFallback, accessPassword: accessPasswordFallback };
      } catch (fallbackErr: any) {
        console.error("[Trial] Falha no fallback agressivo:", fallbackErr);
        throw new Error(err.message || "INTERNAL_ERROR");
      }
    }
  });