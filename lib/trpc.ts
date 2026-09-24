import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          // 1) حاول من Cache / SecureStore
          let token: string | null = null;
          try {
            token = await Auth.getSessionToken();
          } catch {
            token = null;
          }

          // 2) fallback من الذاكرة العامة إذا فشلت القراءة
          if (!token && typeof globalThis !== "undefined") {
            token = (globalThis as any).__CWAXX_TOKEN__ ?? null;
          }

          // 3) تحقق أن التوكن فعلاً نص غير فارغ
          if (!token || typeof token !== "string" || token.length < 10) {
            console.warn("[trpc] No valid token found for request");
            return {};
          }

          return { Authorization: `Bearer ${token}` };
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
