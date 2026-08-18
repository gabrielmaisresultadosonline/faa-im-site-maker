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
            "Vary": "Origin",
          }
        });
      },
      POST: async ({ request }) => {
        const requestId = Math.random().toString(36).substring(7);
        try {
          console.log(`[API-${requestId}] Recebendo requisição na API da extensão...`);
          let body: LoginBody;
          const rawBody = await request.text();
          console.log(`[API-${requestId}] Body Size:`, rawBody.length);
          
          if (!rawBody) {
            console.error(`[API-${requestId}] Empty body received`);
            return json({ success: false, error: "Empty request body" }, 400);
          }

          try {
            body = JSON.parse(rawBody) as LoginBody;
          } catch (e) {
            console.error(`[API-${requestId}] JSON Parse Error:`, e, "Raw:", rawBody);
            return json({ success: false, error: "Invalid JSON body" }, 400);
          }

          const email = (body.email ?? "").trim().toLowerCase();
          const rawPassword = body.password ?? "";
          const password = rawPassword.trim();
          
          console.log(`[API-${requestId}] Tentativa de login para: ${email}`);
          const sessionId = body.session_id;

          if (body.action !== "login") {
            return json({ success: false, error: "Unsupported action" }, 400);
          }
          if (!email || !password) {
            return json({ success: false, error: "Missing credentials" }, 400);
          }

          const url = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
          const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SERVICE_ROLE_KEY"];
          
          if (!url || !key) {
            console.error(`[API-${requestId}] Missing Supabase configuration. URL: ${!!url}, Key: ${!!key}`);
            return json({ 
              success: false, 
              error: "Configuração do servidor incompleta. Reinicie o serviço no VPS com --update-env." 
            }, 503);
          }

          // Importação dinâmica para evitar que o client.server.ts falhe no boot se as chaves não estiverem prontas
          const { createClient } = await import('@supabase/supabase-js');
          const backend = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false }
          });

          console.log(`[API-${requestId}] Usando backend direto para ${email}...`);

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

          console.log(`[API-${requestId}] Tentando login padrão Supabase para ${email}...`);
          let authResult = await backend.auth.signInWithPassword({ email, password });
          
          if (authResult.error) {
            console.log(`[API-${requestId}] Falhou login inicial, tentando senha sem trim para ${email}...`);
            authResult = await backend.auth.signInWithPassword({ email, password: rawPassword });
          }
          
          if (authResult.error) {
            console.log(`[API-${requestId}] Tentando variações de e-mail como senha para ${email}...`);
            const variations = [email, email.toUpperCase(), email.split('@')[0], (email.split('@')[0] || '').toUpperCase()];
            for (const v of variations) {
              if (v && v !== password) {
                const retry = await backend.auth.signInWithPassword({ email, password: v });
                if (!retry.error) {
                  authResult = retry;
                  break;
                }
              }
            }
          }

          if (authResult.error || !authResult.data.user) {
            console.warn(`[API-${requestId}] Login falhou definitivamente para ${email}:`, authResult.error?.message);
            return json({ success: false, error: "Credenciais inválidas ou conta não encontrada." }, 401);
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
            console.error(`[API-${requestId}] Profile load error:`, profileError);
            return json({ success: false, error: "Unable to load account profile" }, 502);
          }
          
          if (subError) console.error(`[API-${requestId}] Subscription load error:`, subError);
          if (settingsError) console.error(`[API-${requestId}] Settings load error:`, settingsError);

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
          console.error(`[API-${requestId}] Lovablack API request failed:`, errMsg, error);
          
          if (errMsg.includes("Missing Supabase environment variable")) {
             return json({ 
               success: false, 
               error: "Erro de configuração no servidor. Verifique as variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no VPS." 
             }, 500);
          }
          
          return json({ 
            success: false, 
            error: "Erro interno no servidor ao processar login da extensão.",
            details: process.env['NODE_ENV'] === 'development' ? errMsg : undefined
          }, 500);
        }
      },
    },
  },
});
