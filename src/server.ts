import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    console.log("Loading server entry...");
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => {
        console.log("Server entry loaded successfully.");
        return (m.default ?? m) as ServerEntry;
      },
    ).catch(err => {
      console.error("FAILED TO LOAD SERVER ENTRY:", err);
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
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      console.log(`Incoming request: ${request.method} ${request.url}`);
      // In Nitro/Node environments, process.env might be used instead of the 'env' parameter
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      console.log(`Response status: ${response.status}`);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error("CATASTROPHIC SSR ERROR:", error);
      
      // If we are in a serverless-like context, we might need to be careful with global process.env
      const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
      console.error("Full stack trace:", errorMessage);

      return new Response(renderErrorPage(errorMessage), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
