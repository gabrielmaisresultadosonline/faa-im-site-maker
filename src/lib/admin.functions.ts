import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Lista todos os usuarios com perfil, ultimo acesso e assinatura mais recente. */
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: subs, error: subsError } = await context.supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (subsError) throw new Error(subsError.message);

    const now = Date.now();
    return (profiles ?? []).map((p) => {
      const sub = (subs ?? []).find((s) => s.user_id === p.id) ?? null;
      const isExpired = sub ? new Date(sub.expires_at).getTime() < now : true;
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        whatsapp: p.whatsapp,
        language: p.language,
        blocked: p.blocked,
        custom_message: p.custom_message,
        last_login_at: p.last_login_at,
        last_heartbeat_at: p.last_heartbeat_at,
        session_id: p.session_id,
        access_password: p.access_password,
        created_at: p.created_at,
        plan: sub?.type ?? null,
        expires_at: sub?.expires_at ?? null,
        is_active: !!sub && !isExpired && sub.status === "active",
      };
    });
  });

/** Cria um usuario manualmente ja com o plano selecionado. */
export const adminCreateUser = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(1),
        whatsapp: z.string().optional(),
        language: z.enum(["pt", "en"]).default("pt"),
        plan: z.enum(["trial", "monthly", "semiannual", "annual"]),
        days: z.number().int().positive().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { assertAdmin, computeExpiry } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { generateAccessPassword } = await import("@/lib/access-code");

    // USAMOS O CLIENT DO USUARIO ( context.supabase ) PARA CRIAR O USUARIO
    // ISSO RESOLVE O ERRO DE VARIÁVEL DE AMBIENTE SUPABASE_SERVICE_ROLE_KEY
    // E GARANTE QUE O USUÁRIO SEJA CRIADO NO BACKEND CORRETO.
    const { data: authUser, error: signupError } = await context.supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, language: data.language },
    });

    if (signupError) {
      // Fallback para signup publico se createUser (admin) falhar por falta de permissao do token
      const { data: pubData, error: pubError } = await context.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { 
            full_name: data.fullName, 
            language: data.language,
            plain_password: data.password,
            is_trial: data.plan === 'trial' ? 'true' : 'false'
          },
        }
      });
      
      if (pubError) throw new Error(pubError.message);
      if (!pubData.user) throw new Error("Falha ao criar usuário");
      
      const userId = pubData.user.id;
      
      // Se não for trial, o trigger ja criou o trial ou nada.
      // Precisamos forçar o plano escolhido pelo admin se não for trial.
      if (data.plan !== 'trial') {
        await finishUserSetup(context.supabase, userId, data, generateAccessPassword, computeExpiry);
      } else {
        // Apenas atualiza o perfil (senha de acesso, etc) pois o trial ja foi via trigger
        await context.supabase.from("profiles").update({
          access_password: generateAccessPassword(),
          whatsapp: data.whatsapp ?? null,
        }).eq("id", userId);
      }
      return { userId };
    }

    const userId = authUser.user.id;
    
    // Como o admin.createUser NÃO dispara o gatilho de auth.users automaticamente da mesma forma que o signUp
    // (dependendo da configuração do Supabase), forçamos a finalização aqui.
    await finishUserSetup(context.supabase, userId, data, generateAccessPassword, computeExpiry);
    return { userId };
  });

async function finishUserSetup(supabase: any, userId: string, data: any, generateAccessPassword: any, computeExpiry: any) {
  const { error: profileError } = await supabase.from("profiles").update({
    full_name: data.fullName,
    whatsapp: data.whatsapp ?? null,
    language: data.language,
    access_password: generateAccessPassword(),
  }).eq("id", userId);
  
  if (profileError) throw new Error(`Usuário criado, mas o perfil falhou: ${profileError.message}`);

  const { error: subscriptionError } = await supabase.from("subscriptions").insert({
    user_id: userId,
    type: data.plan,
    status: "active",
    expires_at: computeExpiry(data.plan, data.days),
  });
  
  if (subscriptionError) {
    throw new Error(`Usuário criado, mas o plano falhou: ${subscriptionError.message}`);
  }
}


/** Atualiza bloqueio, aviso individual ou reseta a sessao (multi-login) do usuario. */
export const adminUpdateUser = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        blocked: z.boolean().optional(),
        customMessage: z.string().optional(),
        resetSession: z.boolean().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const patch: {
      blocked?: boolean;
      custom_message?: string | null;
      session_id?: string | null;
    } = {};
    if (data.blocked !== undefined) patch.blocked = data.blocked;
    if (data.customMessage !== undefined) patch.custom_message = data.customMessage;
    if (data.resetSession) patch.session_id = null;

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Concede/renova manualmente um plano para o usuario. */
export const adminSetPlan = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        plan: z.enum(["trial", "monthly", "semiannual", "annual"]),
        days: z.number().int().positive().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { assertAdmin, computeExpiry } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { error } = await context.supabase.from("subscriptions").upsert({
      user_id: data.userId,
      type: data.plan,
      status: "active",
      expires_at: computeExpiry(data.plan, data.days),
    }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
