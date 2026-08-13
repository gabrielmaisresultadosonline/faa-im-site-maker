import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Server Error:", error);

    // If the client requested JSON (e.g. from a server function call via TanStack Query),
    // return a JSON response instead of HTML to avoid "Body has already been read" deserialization errors.
    const accept = request.headers.get("accept") || "";
    if (accept.includes("application/json") || request.headers.get("x-server-fn")) {
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: error instanceof Error ? error.message : "Internal Server Error" 
        }), 
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
