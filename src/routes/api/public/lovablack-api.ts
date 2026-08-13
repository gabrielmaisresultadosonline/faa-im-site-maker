import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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

        // 1. Try Login with Access Password first (Extension specific)
        const { data: accessData, error: accessError } = await supabase.rpc(
          "login_extension_with_access_password",
          {
            _email: email,
            _access_password: password,
            _session_id: sessionId,
          }
        );

        if (!accessError && accessData?.success) {
          return json(accessData);
        }

        // If it was a MULTI_LOGIN error from the RPC, return it directly
        if (accessData?.code === "MULTI_LOGIN" || accessData?.code === "BLOCKED") {
          return json(accessData, accessData.code === "BLOCKED" ? 403 : 403);
        }

        // 2. Try Standard Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError || !authData.session) {
          return json({ success: false, error: "Invalid credentials" }, 401);
        }

        // 3. Get User Data for the authenticated session
        // Note: Using a fresh client or the existing one that now has session
        const { data: userData, error: userError } = await supabase.rpc(
          "get_extension_user_data",
          {
            _session_id: sessionId,
          }
        );

        // Sign out after getting data to keep it stateless for the API
        await supabase.auth.signOut();

        if (userError || !userData?.success) {
          return json(
            userData || { success: false, error: userError?.message || "Failed to fetch user data" },
            userData?.code === "MULTI_LOGIN" || userData?.code === "BLOCKED" ? 403 : 500
          );
        }

        return json(userData);
      },
    },
  },
});
