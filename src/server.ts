import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

console.log("[SERVER_BOOT] Initializing server.ts entry point...");

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntry: ServerEntry | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntry) {
    try {
      console.log("[SERVER_BOOT] Loading server entry...");
      // @ts-ignore - Dynamic import for SSR
      const m = await import("@tanstack/react-start/server-entry");
      serverEntry = (m.default ?? m) as ServerEntry;
      console.log("[SERVER_BOOT] Server entry loaded successfully.");
    } catch (err) {
      console.error("[SERVER_BOOT] CRITICAL: FAILED TO LOAD SERVER ENTRY.", err);
      throw err;
    }
  }
  return serverEntry;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  try {
    const body = await response.clone().text();
    const payload = JSON.parse(body);
    
    if (payload.unhandled === true && payload.message === "HTTPError") {
      console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
      return new Response(renderErrorPage(`Erro Interno do Servidor (SSR Failure)`), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  } catch (e) {
    // Ignorar erro de parse
  }
  
  return response;
}

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);
    try {
      // Injeta environment vars do runtime (PM2/Nitro)
      if (env && typeof env === 'object') {
        Object.keys(env).forEach(key => {
          if (env[key] && !process.env[key]) {
            process.env[key] = String(env[key]);
          }
        });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      
      if (response.status >= 500) {
        console.error(`[SSR_ERROR] ${response.status} on ${url.pathname}`);
      }
      
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(`[CATASTROPHIC_ERROR] ${url.pathname}:`, error);
      const trace = error instanceof Error ? error.stack : String(error);
      return new Response(renderErrorPage(trace), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
