export type ServerEnvBindings = {
  JWT_SECRET?: string;
  VITE_APP_ID?: string;
  DATABASE_URL?: string;
  OAUTH_SERVER_URL?: string;
  OWNER_OPEN_ID?: string;
  BUILT_IN_FORGE_API_URL?: string;
  BUILT_IN_FORGE_API_KEY?: string;
};

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

/** Populate server-only configuration from Cloudflare Worker bindings. */
export function configureServerEnvironment(bindings: ServerEnvBindings) {
  if (bindings.JWT_SECRET) ENV.cookieSecret = bindings.JWT_SECRET;
  if (bindings.VITE_APP_ID !== undefined) ENV.appId = bindings.VITE_APP_ID;
  if (bindings.DATABASE_URL) ENV.databaseUrl = bindings.DATABASE_URL;
  if (bindings.OAUTH_SERVER_URL !== undefined) ENV.oAuthServerUrl = bindings.OAUTH_SERVER_URL;
  if (bindings.OWNER_OPEN_ID !== undefined) ENV.ownerOpenId = bindings.OWNER_OPEN_ID;
  if (bindings.BUILT_IN_FORGE_API_URL !== undefined) ENV.forgeApiUrl = bindings.BUILT_IN_FORGE_API_URL;
  if (bindings.BUILT_IN_FORGE_API_KEY !== undefined) ENV.forgeApiKey = bindings.BUILT_IN_FORGE_API_KEY;
}

export function assertServerEnvironment() {
  const missing: string[] = [];

  if (!ENV.cookieSecret) missing.push("JWT_SECRET");

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
