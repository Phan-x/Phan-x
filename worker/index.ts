import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { assertServerEnvironment, configureServerEnvironment, type ServerEnvBindings } from "../server/_core/env";
import { processDueTradePayouts, runWithDatabase } from "../server/db";

type Env = ServerEnvBindings & {
  HYPERDRIVE: { connectionString: string };
  ASSETS: Fetcher;
  API_ALLOWED_ORIGINS?: string;
};

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const configured = (env.API_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.length === 0 || configured.includes(origin)) return origin;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return origin;
  return null;
}

function withCors(response: Response, request: Request, env: Env): Response {
  const origin = allowedOrigin(request, env);
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(data: unknown, status = 200, request?: Request, env?: Env) {
  const response = Response.json(data, { status });
  return request && env ? withCors(response, request, env) : response;
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    configureServerEnvironment(env);
    assertServerEnvironment();
    // Own DB client for this cron run: never share connections with fetch requests.
    await runWithDatabase(env.HYPERDRIVE.connectionString, async () => {
      try {
        const result = await processDueTradePayouts(new Date(controller.scheduledTime));
        console.log("[Trade] scheduled payout run", result);
      } catch (error) {
        console.error("[Trade] scheduled payout run failed", error);
        throw error;
      }
    }, ctx);
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      configureServerEnvironment(env);
      assertServerEnvironment();
      // One DB client per request (Workers cannot share sockets across requests).
      return await runWithDatabase(
        env.HYPERDRIVE.connectionString,
        () => handleRequest(request, env),
        ctx,
      );
    } catch (error) {
      console.error("[Worker] Request failed", error);
      return json({ error: "Internal server error" }, 500, request, env);
    }
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
  {
    try {

      if (request.method === "OPTIONS") {
        return withCors(new Response(null, { status: 204 }), request, env);
      }

      const url = new URL(request.url);

      if (url.pathname === "/api/health") {
        return json({ ok: true, service: "CwaAX API", timestamp: Date.now() }, 200, request, env);
      }

      // Local/web logout: the browser may still have the httpOnly app_session_id
      // cookie even after the JWT in localStorage is removed. Clear both the
      // host cookie and the parent-domain variant used by preview subdomains.
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const headers = new Headers({
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        const hostname = url.hostname;
        const secure = url.protocol === "https:" ? "; Secure" : "";
        const sameSite = "; SameSite=None";
        const base = `Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly${secure}${sameSite}`;
        headers.append("Set-Cookie", `app_session_id=; ${base}`);
        const parts = hostname.split(".");
        if (parts.length >= 3) {
          const parentDomain = `.${parts.slice(-2).join(".")}`;
          headers.append("Set-Cookie", `app_session_id=; Domain=${parentDomain}; ${base}`);
        }
        return withCors(new Response(JSON.stringify({ success: true }), { status: 200, headers }), request, env);
      }

      if (url.pathname === "/api/trpc" || url.pathname.startsWith("/api/trpc/")) {
        const response = await fetchRequestHandler({
          endpoint: "/api/trpc",
          req: request,
          router: appRouter,
          createContext: ({ req }) => createContext({ req }),
          onError({ path, error }) {
            console.error("[tRPC]", path, error);
          },
        });
        return withCors(response, request, env);
      }

      if (url.pathname.startsWith("/api/")) {
        return json({ error: "API endpoint not found" }, 404, request, env);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("[Worker] Request failed", error);
      return json({ error: "Internal server error" }, 500, request, env);
    }
  }
}
