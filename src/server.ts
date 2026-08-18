import "./lib/error-capture";
console.log("[SERVER_BOOT] Initializing server.ts entry point...");

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    console.log("[SERVER_BOOT] Loading server entry...");
    
    serverEntryPromise = import("@tanstack/react-start/server-entry")
      .then((m) => {
        console.log("[SERVER_BOOT] Server entry loaded successfully.");
        return (m.default ?? m) as ServerEntry;
      })
      .catch((err) => {
        console.error("[SERVER_BOOT] CRITICAL: FAILED TO LOAD SERVER ENTRY.", err);
        throw err;
      });
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: any, ctx: any) {
    try {
      const port = process.env['PORT'] || process.env['NITROPACK_PORT'] || "unknown";
      const host = process.env['HOST'] || "0.0.0.0";
      console.log(`[SSR] Incoming request: ${request.method} ${request.url} (Server Port: ${port}, Host: ${host})`);
      
      // Sincronizar environment vars do runtime PM2 com process.env
      if (env && typeof env === 'object') {
        Object.keys(env).forEach(key => {
          if (env[key] && !process.env[key]) {
            process.env[key] = String(env[key]);
          }
        });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      
      console.log(`[SSR] Response status: ${response.status} for ${request.url}`);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error("CATASTROPHIC SSR ERROR during request handling:", error);
      
      const errorMessage = error instanceof Error ? (error.stack || error.message) : String(error);
      console.error("Full diagnostic trace:", errorMessage);

      // Return a detailed error page in Portuguese for debugging on VPS
      return new Response(renderErrorPage(errorMessage), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
