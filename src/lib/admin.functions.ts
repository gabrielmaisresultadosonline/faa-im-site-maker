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

    const backendUrl = process.env["SUPABASE_URL"];
    const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!backendUrl || !publishableKey) {
      throw new Error("Configuração do backend indisponível no servidor.");
    }

    const signupResponse = await fetch(`${backendUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        data: { full_name: data.fullName, language: data.language },
      }),
    });
    const signupResult = (await signupResponse.json()) as {
      id?: string;
      user?: { id?: string };
      msg?: string;
      message?: string;
      error_description?: string;
    };
    const userId = signupResult.user?.id ?? signupResult.id;
    if (!signupResponse.ok || !userId) {
      throw new Error(
        signupResult.msg ?? signupResult.message ?? signupResult.error_description ?? "Falha ao criar usuário",
      );
    }

    const { error: profileError } = await context.supabase.from("profiles").update({
      full_name: data.fullName,
      whatsapp: data.whatsapp ?? null,
      language: data.language,
      access_password: generateAccessPassword(),
    }).eq("id", userId);
    if (profileError) throw new Error(`Usuário criado, mas o perfil falhou: ${profileError.message}`);

    const { error: subscriptionError } = await context.supabase.from("subscriptions").insert({
      user_id: userId,
      type: data.plan,
      status: "active",
      expires_at: computeExpiry(data.plan, data.days),
    });
    if (subscriptionError) {
      throw new Error(`Usuário criado, mas o plano falhou: ${subscriptionError.message}`);
    }

    return { userId };
  });

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
