import { createFileRoute } from "@tanstack/react-router";

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

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function supabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const Route = createFileRoute("/api/public/lovablack-api")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: { ...CORS, "Access-Control-Max-Age": "86400", Vary: "Origin" },
        }),

      POST: async ({ request }) => {
        const rid = Math.random().toString(36).slice(2, 8);
        try {
          const raw = await request.text();
          if (!raw) return json({ success: false, error: "Empty request body" }, 400);

          let body: LoginBody;
          try {
            body = JSON.parse(raw) as LoginBody;
          } catch {
            return json({ success: false, error: "Invalid JSON body" }, 400);
          }

          if (body.action !== "login") {
            return json({ success: false, error: "Unsupported action" }, 400);
          }

          const email = (body.email ?? "").trim().toLowerCase();
          const rawPassword = body.password ?? "";
          const password = rawPassword.trim();
          const sessionId = body.session_id ?? "";

          if (!email || !password) {
            return json({ success: false, error: "Missing credentials" }, 400);
          }

          // Chave publica basta: login e leituras sao feitos como o proprio usuario (RLS).
          const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
          const anonKey =
            process.env["SUPABASE_PUBLISHABLE_KEY"] ||
            process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

          if (!url || !anonKey) {
            console.error(`[API-${rid}] Config ausente no ambiente. URL:${!!url} KEY:${!!anonKey}`);
            return json(
              { success: false, error: "Servidor em manutencao: configuracao de rede ausente." },
              503,
            );
          }

          // Debug parcial das chaves (apenas prefixo e sufixo para seguranca)
          const mask = (s: string) => `${s.slice(0, 6)}...${s.slice(-4)}`;
          console.log(`[API-${rid}] Usando URL: ${url} | Key: ${mask(anonKey)}`);

          const { createClient } = await import("@supabase/supabase-js");
          const publicClient = createClient(url, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            global: { fetch: supabaseFetch(anonKey) },
          });

          // 1) Tenta login usando a função Security Definer (acessa perfis e senhas de acesso diretamente)
          // Usamos o supabaseAdmin para garantir privilégios de execução e leitura
          const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
          
          const { data: accessData, error: accessError } = await adminClient.rpc(
            "login_extension_with_access_password",
            { _email: email, _access_password: password, _session_id: sessionId },
          );

          if (!accessError && isLoginResult(accessData)) {
            if (accessData.success) {
              console.log(`[API-${rid}] Login via access_password bem-sucedido para ${email}`);
              return json(accessData);
            }
            if (accessData.code === "MULTI_LOGIN" || accessData.code === "BLOCKED") {
              console.warn(`[API-${rid}] Login bloqueado pela função RPC para ${email}: ${accessData.code}`);
              return json(accessData, 403);
            }
          }

          if (accessError) {
            console.error(`[API-${rid}] Erro na função RPC login_extension: ${accessError.message}`);
          }

          // 2) Login padrão com email/senha caso a senha de acesso falhe ou não exista
          console.log(`[API-${rid}] Tentando login padrão Supabase Auth para ${email}...`);
          let auth = await publicClient.auth.signInWithPassword({ email, password });
          
          if (auth.error && rawPassword !== password) {
            console.log(`[API-${rid}] Falhou login inicial, tentando senha sem trim para ${email}...`);
            auth = await publicClient.auth.signInWithPassword({ email, password: rawPassword });
          }

          if (auth.error || !auth.data.user || !auth.data.session) {
            console.warn(`[API-${rid}] Login falhou definitivamente para ${email}: ${auth.error?.message ?? "sem sessão"}`);
            return json(
              { 
                success: false, 
                error: "Credenciais inválidas ou conta não encontrada. Verifique se a chave do backend está configurada corretamente no VPS.",
                debug_info: auth.error?.message
              },
              401,
            );
          }

          const userId = auth.data.user.id;

          const [profileRes, subRes, settingsRes] = await Promise.all([
            publicClient
              .from("profiles")
              .select("full_name,email,language,blocked,custom_message")
              .eq("id", userId)
              .maybeSingle(),
            publicClient
              .from("subscriptions")
              .select("type,status,expires_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            publicClient.from("app_settings").select("key,value"),
          ]);

          const profile = profileRes.data;
          if (profileRes.error || !profile) {
            console.error(`[API-${rid}] Profile error:`, profileRes.error?.message);
            return json({ success: false, error: "Unable to load account profile" }, 502);
          }

          const settingsMap: Record<string, unknown> = {};
          (settingsRes.data ?? []).forEach((s: { key: string; value: unknown }) => {
            settingsMap[s.key] = s.value;
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

          const subscription = subRes.data;
          const isExpired =
            !subscription ||
            subscription.status !== "active" ||
            new Date(subscription.expires_at).getTime() <= Date.now();

          // Encerra a sessao criada apenas para validar o login.
          await publicClient.auth.signOut();

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
          const msg = error instanceof Error ? error.message : "Unknown error";
          console.error(`[API-${rid}] Falha inesperada:`, msg);
          return json(
            { success: false, error: "Erro interno no servidor ao processar login." },
            500,
          );
        }
      },
    },
  },
});
