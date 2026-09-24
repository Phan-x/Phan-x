/**
 * Passes a scanned QR value from qr-scanner.tsx back to send.tsx.
 *
 * IMPORTANT: state lives on `globalThis`, not a module-level `let`.
 * See the comment in alert-store.ts for why — Expo Router's static
 * web export can duplicate a plain module singleton across per-route
 * JS bundles, silently breaking cross-screen communication like this.
 */

const KEY = "__cwaaxQrStore";

function getStore(): { pendingScan: string | null } {
  const g = globalThis as unknown as Record<string, { pendingScan: string | null }>;
  if (!g[KEY]) {
    g[KEY] = { pendingScan: null };
  }
  return g[KEY];
}

export function setPendingScan(value: string) {
  getStore().pendingScan = value;
}

export function consumePendingScan(): string | null {
  const store = getStore();
  const value = store.pendingScan;
  store.pendingScan = null;
  return value;
}
