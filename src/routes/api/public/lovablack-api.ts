import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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
          const sessionId = body.session_id;

          if (body.action !== "login") {
            return json({ success: false, error: "Unsupported action" }, 400);
          }
          if (!email || !password) {
            return json({ success: false, error: "Missing credentials" }, 400);
          }

          const url = process.env["SUPABASE_URL"];
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
          if (!url || !key) {
            return json({ success: false, error: "Server configuration unavailable" }, 503);
          }

          const backend = createClient<Database>(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: accessData, error: accessError } = await backend.rpc(
            "login_extension_with_access_password",
            { _email: email, _access_password: password, _session_id: sessionId ?? "" },
          );

          if (!accessError && isLoginResult(accessData)) {
            if (accessData.success) return json(accessData);
            if (accessData.code === "MULTI_LOGIN" || accessData.code === "BLOCKED") {
              return json(accessData, 403);
            }
          }

          const { data: authData, error: authError } = await backend.auth.signInWithPassword({
            email,
            password,
          });

          if (authError || !authData.user) {
            return json({ success: false, error: "Invalid credentials" }, 401);
          }

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

          if (profileError || subError || settingsError || !profile) {
            return json({ success: false, error: "Unable to load account or settings" }, 502);
          }

          const settingsMap: Record<string, any> = {};
          (settings ?? []).forEach(s => settingsMap[s.key] = s.value);

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
          console.error(
            "Lovablack API request failed",
            error instanceof Error ? error.message : "Unknown error",
          );
          return json({ success: false, error: "Internal server error" }, 500);
        }
      },
    },
  },
});
