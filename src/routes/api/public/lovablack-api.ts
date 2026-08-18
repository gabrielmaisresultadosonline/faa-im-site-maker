import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: CORS });
}

interface LoginBody {
  action?: string;
  email?: string;
  password?: string;
  session_id?: string;
}

interface LoginResult {
  success: boolean;
  code?: string;
  error?: string;
  user?: Record<string, unknown>;
}

function isLoginResult(value: unknown): value is LoginResult {
  return typeof value === "object" && value !== null && "success" in value;
}

export const Route = createFileRoute("/api/public/lovablack-api")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            ...CORS,
            "Access-Control-Max-Age": "86400",
          }
        });
      },
      POST: async ({ request }) => {
        try {
          console.log("Recebendo requisição na API da extensão...");
          let body: LoginBody;
          try {
            const rawBody = await request.text();
            console.log("API Extension Body Size:", rawBody.length);
            body = JSON.parse(rawBody) as LoginBody;
          } catch (e) {
            console.error("JSON Parse Error in API:", e);
            return json({ success: false, error: "Invalid JSON body" }, 400);
          }

          const email = (body.email ?? "").trim().toLowerCase();
          const rawPassword = body.password ?? "";
          const password = rawPassword.trim();
          
          console.log(`Tentativa de login para: ${email}`);
          const sessionId = body.session_id;

          if (body.action !== "login") {
            return json({ success: false, error: "Unsupported action" }, 400);
          }
          if (!email || !password) {
            return json({ success: false, error: "Missing credentials" }, 400);
          }

          // Use VITE_ variables which are more reliable across environments (Lovable Cloud/VPS)
          const url = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
          const key = process.env["VITE_SUPABASE_ANON_KEY"] || process.env["SUPABASE_ANON_KEY"];
          const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SERVICE_ROLE_KEY"];
          
          if (!url) {
            console.error("Missing SUPABASE_URL configuration.");
            return json({ success: false, error: "Configuração do servidor incompleta (URL)." }, 503);
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          // Resilient client selection
          let backend;
          try {
            backend = supabaseAdmin;
            // Test access to the proxy
            const _url = backend.auth;
            if (!backend.auth) throw new Error("supabaseAdmin.auth is null");
          } catch (e) {
            console.error("supabaseAdmin failed, falling back to public client", e);
            const { supabase } = await import("@/integrations/supabase/client");
            backend = supabase;
          }

          console.log(`Usando backend para ${email}...`);

          const { data: accessData, error: accessError } = await backend.rpc(
            "login_extension_with_access_password",
            { 
              _email: email, 
              _access_password: password, 
              _session_id: sessionId ?? "" 
            },
          );

          if (!accessError && isLoginResult(accessData)) {
            if (accessData.success) return json(accessData);
            if (accessData.code === "MULTI_LOGIN" || accessData.code === "BLOCKED") {
              return json(accessData, 403);
            }
          }

          // Fallback ao login padrão do Supabase se o RPC falhar ou não encontrar o usuário via access_password.
          // Testamos com a senha original E com variações se necessário para ser resiliente a apps de extensão.
          let authResult = await backend.auth.signInWithPassword({ email, password });
          
          if (authResult.error) {
            // Se falhou com trim, tenta com a senha exatamente como veio (sem trim)
            authResult = await backend.auth.signInWithPassword({ email, password: rawPassword });
          }
          
          if (authResult.error) {
            // Se ainda falhou, tenta tudo minúsculo e tudo maiúsculo se a senha original for parecida com o email
            const emailPart = email.split('@')[0] || '';
            const passLow = rawPassword.toLowerCase();
            if (emailPart && (passLow.includes(emailPart) || passLow === email)) {
              console.log(`Tentando variações de senha para ${email}...`);
              authResult = await backend.auth.signInWithPassword({ email, password: email });
              if (authResult.error) {
                authResult = await backend.auth.signInWithPassword({ email, password: rawPassword.toUpperCase() });
              }
            }
          }

          if (authResult.error || !authResult.data.user) {
            console.warn(`Login falhou para ${email}:`, authResult.error?.message);
            return json({ success: false, error: "Invalid credentials" }, 401);
          }
          
          const authData = authResult.data;

          const [{ data: profile, error: profileError }, { data: subscription, error: subError }, { data: settings, error: settingsError }] =
            await Promise.all([
              backend
                .from("profiles")
                .select("full_name,email,language,blocked,custom_message")
                .eq("id", authData.user.id)
                .single(),
              backend
                .from("subscriptions")
                .select("type,status,expires_at")
                .eq("user_id", authData.user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
              backend
                .from("app_settings")
                .select("key,value")
            ]);

          if (profileError || !profile) {
            console.error("Profile load error:", profileError);
            return json({ success: false, error: "Unable to load account profile" }, 502);
          }
          
          if (subError) console.error("Subscription load error:", subError);
          if (settingsError) console.error("Settings load error:", settingsError);

          const settingsMap: Record<string, any> = {};
          (settings ?? []).forEach((s: any) => settingsMap[s.key] = s.value);

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

          const isExpired =
            !subscription ||
            subscription.status !== "active" ||
            new Date(subscription.expires_at).getTime() <= Date.now();

          return json({
            success: true,
            user: {
              name: profile.full_name ?? "",
              email: profile.email,
              language: profile.language,
              plan: subscription?.type ?? null,
              expires_at: subscription?.expires_at ?? null,
              is_active: !isExpired,
              is_expired: isExpired,
              blocked: false,
              custom_message: profile.custom_message ?? "",
              global_announcement: settingsMap["global_announcement"] ?? "",
              min_version: settingsMap["min_version"] ?? "1.0.0",
              multi_login_block: settingsMap["multi_login_block"] === true,
              member_area_url: `https://lovblack.online/dashboard?email=${encodeURIComponent(email)}&token=${encodeURIComponent(password)}`,
            },
          });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          console.error("Lovablack API request failed:", errMsg);
          
          if (errMsg.includes("Missing Supabase environment variable")) {
             return json({ 
               success: false, 
               error: "Erro de configuração no servidor. Verifique as variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no VPS." 
             }, 500);
          }
          
          return json({ success: false, error: "Erro interno no servidor." }, 500);
        }
      },
    },
  },
});
