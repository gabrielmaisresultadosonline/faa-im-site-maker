import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const planSchema = z.enum(["trial", "monthly", "semiannual", "annual"]);

/** Lista todos os usuarios com perfil, ultimo acesso e assinatura mais recente. */
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: subs, error: subsError } = await supabaseAdmin
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
        plan: planSchema,
        days: z.number().int().positive().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { assertAdmin, computeExpiry } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateAccessPassword } = await import("@/lib/access-code");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, language: data.language },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");

    const userId = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: data.email,
      full_name: data.fullName,
      whatsapp: data.whatsapp ?? null,
      language: data.language,
      access_password: generateAccessPassword(),
    });

    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      type: data.plan,
      status: "active",
      expires_at: computeExpiry(data.plan, data.days),
    });

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: {
      blocked?: boolean;
      custom_message?: string | null;
      session_id?: string | null;
    } = {};
    if (data.blocked !== undefined) patch.blocked = data.blocked;
    if (data.customMessage !== undefined) patch.custom_message = data.customMessage;
    if (data.resetSession) patch.session_id = null;

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Concede/renova manualmente um plano para o usuario. */
export const adminSetPlan = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        plan: planSchema,
        days: z.number().int().positive().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { assertAdmin, computeExpiry } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: data.userId,
      type: data.plan,
      status: "active",
      expires_at: computeExpiry(data.plan, data.days),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
