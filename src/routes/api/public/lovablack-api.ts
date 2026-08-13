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

interface ExtensionLoginResult {
  success: boolean;
  error?: string;
  code?: string;
  user?: Record<string, unknown>;
}

function getBackendConfig(): { url: string; key: string } | null {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  return url && key ? { url, key } : null;
}

function withMemberAreaUrl(
  result: ExtensionLoginResult,
  email: string,
  password: string,
): ExtensionLoginResult {
  if (!result.success || !result.user) return result;

  return {
    ...result,
    user: {
      ...result.user,
      member_area_url: `https://lovblack.online/dashboard?email=${encodeURIComponent(email)}&token=${encodeURIComponent(password)}`,
    },
  };
}

export const Route = createFileRoute("/api/public/lovablack-api")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
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

          const config = getBackendConfig();
          if (!config) {
            return json({ success: false, error: "Server configuration unavailable" }, 503);
          }

          const backend = createClient(config.url, config.key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          // First validate normal account credentials. This never requires a
          // privileged server key and remains protected by row-level access rules.
          const { data: authData, error: authError } = await backend.auth.signInWithPassword({
            email,
            password,
          });

          if (!authError && authData.user) {
            const [{ data: profile, error: profileError }, { data: sub, error: subError }, settingsRows] =
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
                backend.from("app_settings").select("key,value"),
              ]);

            if (profileError || subError || !profile) {
              return json({ success: false, error: "Unable to load account" }, 502);
            }

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

            const settings = Object.fromEntries(
              (settingsRows.data ?? []).map((row) => [row.key, row.value]),
            );
            const isExpired = !sub || sub.status !== "active" || new Date(sub.expires_at).getTime() <= Date.now();

            return json(withMemberAreaUrl({
              success: true,
              user: {
                name: profile.full_name ?? "",
                email: profile.email,
                language: profile.language,
                plan: sub?.type ?? null,
                expires_at: sub?.expires_at ?? null,
                is_active: !isExpired,
                is_expired: isExpired,
                blocked: false,
                custom_message: profile.custom_message ?? "",
                global_announcement: settings["global_announcement"] ?? "",
                min_version: settings["min_version"] ?? "1.0.0",
              },
            }, email, password));
          }

          // The extension-specific password is verified atomically in the
          // database, exposing no profile rows and requiring no admin secret.
          const { data: extensionResult, error: extensionError } = await backend.rpc(
            "login_extension_with_access_password",
            {
              _email: email,
              _access_password: password,
              _session_id: sessionId,
            },
          );

          if (extensionError) {
            console.error("Lovablack extension login failed", extensionError.code);
            return json({ success: false, error: "Unable to validate credentials" }, 502);
          }

          const result = extensionResult as ExtensionLoginResult | null;
          if (!result?.success) {
            const status = result?.code === "BLOCKED" || result?.code === "MULTI_LOGIN" ? 403 : 401;
            return json(result ?? { success: false, error: "Invalid credentials" }, status);
          }

          return json(withMemberAreaUrl(result, email, password));
        } catch (error) {
          console.error("Lovablack API request failed", error instanceof Error ? error.message : "Unknown error");
          return json({ success: false, error: "Internal server error" }, 500);
        }
      },
    },
  },
});
