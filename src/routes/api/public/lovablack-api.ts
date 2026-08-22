import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
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
        console.log(`[API-${rid}] Requisição POST recebida.`);
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

          // Coleta configurações do backend de forma resiliente
          const url = process.env["SUPABASE_URL"] || 
                      process.env["VITE_SUPABASE_URL"] || 
                      import.meta.env["VITE_SUPABASE_URL"] ||
                      "https://zjvmfmdyuxmyanuuralq.supabase.co";
                      
          const anonKey = process.env["SUPABASE_PUBLISHABLE_KEY"] || 
                          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || 
                          import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

          let adminClient;
          let serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"];
          
          try {
            const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
            adminClient = getSupabaseAdmin();
          } catch (importErr) {
            console.error(`[API-${rid}] Erro ao importar client.server:`, importErr);
            const { createClient: createSupabaseManual } = await import("@supabase/supabase-js");
            const finalKey = serviceKey || anonKey || "sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7";
            adminClient = createSupabaseManual(url, finalKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            });
          }
          const serviceKeyFound = !!serviceKey && serviceKey !== "NO_KEY_PROVIDED";

          if (!url || !anonKey) {
            console.error(`[API-${rid}] Erro: URL ou AnonKey não encontrados.`);
            return json({ success: false, error: "Servidor em configuração." }, 503);
          }

          const { createClient } = await import("@supabase/supabase-js");

          // Se não houver Service Role Key, tentamos operar apenas com a Anon Key
          if (!serviceKeyFound) {
            console.warn(`[API-${rid}] Aviso: Rodando sem SERVICE_ROLE_KEY. Algumas funções administrativas (reset HWID, bypass RLS) estarão indisponíveis.`);
          }

          const publicClient = createClient(url, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            global: { fetch: supabaseFetch(anonKey) },
          });

          // 1) Tenta login via função RPC (Segurança Definer) usando privilégios administrativos
          // Isso ignora RLS e permite verificar campos restritos como access_password e session_id
          let accessData: any = null;
          let accessError: any = null;

          if (serviceKeyFound) {
            try {
              const rpcRes = await adminClient.rpc(
                "login_extension_with_access_password",
                { _email: email, _access_password: password, _session_id: sessionId || null },
              );
              accessData = rpcRes.data;
              accessError = rpcRes.error;

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
            } catch (rpcErr) {
              console.error(`[API-${rid}] Exceção na chamada RPC:`, rpcErr);
            }
          } else {
            console.log(`[API-${rid}] Pulando verificação RPC: SERVICE_ROLE_KEY ausente.`);
          }

          if (accessError && serviceKeyFound) {
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

          // Se não houver Service Role Key, usamos o publicClient (que respeita RLS)
          const dataClient = serviceKeyFound ? adminClient : publicClient;
          
          const [profileRes, subRes, settingsRes] = await Promise.all([
            dataClient
              .from("profiles")
              .select("full_name,email,language,blocked,custom_message")
              .eq("id", userId)
              .maybeSingle(),
            dataClient
              .from("subscriptions")
              .select("type,status,expires_at")
              .eq("user_id", userId)
              .order("expires_at", { ascending: false, nullsFirst: true })
              .limit(5),

            dataClient.from("app_settings").select("key,value"),
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

          // Escolhe a assinatura válida (vitalícia ou ainda dentro do prazo) antes de qualquer expirada.
          const GRACE_MS = 5 * 60 * 1000;
          const subs = (subRes.data ?? []) as Array<{
            type: string | null;
            status: string | null;
            expires_at: string | null;
          }>;
          const isSubActive = (s: { type: string | null; status: string | null; expires_at: string | null }) =>
            s.status === "active" &&
            (s.type === "lifetime" ||
              !s.expires_at ||
              new Date(s.expires_at).getTime() + GRACE_MS > Date.now());

          const subscription = subs.find(isSubActive) ?? subs[0] ?? null;
          const isExpired = !subscription || !isSubActive(subscription);


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
          const stack = error instanceof Error ? error.stack : "";
          console.error(`[API-${rid}] Falha inesperada:`, msg, stack);
          return json(
            { 
              success: false, 
              error: "Erro interno no servidor ao processar login.",
              debug: msg
            },
            500,
          );
        }
      },
    },
  },
});
