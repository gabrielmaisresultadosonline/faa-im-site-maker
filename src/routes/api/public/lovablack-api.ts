import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

interface LoginBody {
  action?: string;
  email?: string;
  password?: string;
  session_id?: string;
}

export const Route = createFileRoute("/api/public/lovablack-api")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: LoginBody;
        try {
          body = (await request.json()) as LoginBody;
        } catch {
          return json({ success: false, error: "Invalid JSON body" }, 400);
        }

        const email = (body.email ?? "").trim().toLowerCase();
        const password = body.password ?? "";
        const sessionId = body.session_id ?? null;

        if (body.action !== "login") {
          return json({ success: false, error: "Unsupported action" }, 400);
        }
        if (!email || !password) {
          return json({ success: false, error: "Missing credentials" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("email", email)
          .maybeSingle();

        if (!profile) {
          return json({ success: false, error: "Invalid credentials" }, 401);
        }

        // Aceita a senha de acesso gerada no dashboard OU a senha da conta.
        let authenticated = !!profile.access_password && profile.access_password === password;

        if (!authenticated) {
          const anonClient = createClient(
            process.env['SUPABASE_URL']!,
            process.env['SUPABASE_PUBLISHABLE_KEY']!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const { error } = await anonClient.auth.signInWithPassword({ email, password });
          authenticated = !error;
        }

        if (!authenticated) {
          return json({ success: false, error: "Invalid credentials" }, 401);
        }

        const settingsRows = await supabaseAdmin.from("app_settings").select("key, value");
        const settings: Record<string, unknown> = {};
        (settingsRows.data ?? []).forEach((row) => {
          settings[row.key] = row.value;
        });

        if (profile.blocked) {
          return json(
            {
              success: false,
              code: "BLOCKED",
              user: { blocked: true, custom_message: profile.custom_message ?? "" },
            },
            403,
          );
        }

        // Bloqueio multi-login (opcional, controlado nas configuracoes globais).
        const multiLoginBlock = settings['multi_login_block'] === true;
        if (multiLoginBlock && sessionId) {
          if (!profile.session_id) {
            await supabaseAdmin.from("profiles").update({ session_id: sessionId }).eq("id", profile.id);
          } else if (profile.session_id !== sessionId) {
            return json({ success: false, code: "MULTI_LOGIN", error: "Session already in use" }, 403);
          }
        }

        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const expiresAt = sub?.expires_at ?? null;
        const isExpired = !sub || new Date(sub.expires_at).getTime() < Date.now();

        await supabaseAdmin
          .from("profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", profile.id);

        return json({
          success: true,
          user: {
            name: profile.full_name ?? "",
            email: profile.email,
            language: profile.language,
            plan: sub?.type ?? null,
            expires_at: expiresAt,
            is_active: !isExpired,
            is_expired: isExpired,
            blocked: false,
            custom_message: profile.custom_message ?? "",
            global_announcement: (settings['global_announcement'] as string) ?? "",
            min_version: (settings['min_version'] as string) ?? "1.0.0",
          },
        });
      },
    },
  },
});
