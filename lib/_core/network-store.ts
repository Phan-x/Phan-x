/**
 * Shared "selected network" state used by send.tsx / receive.tsx /
 * network-select.tsx.
 *
 * IMPORTANT: state lives on `globalThis`, not a module-level `let`.
 * See the comment in alert-store.ts for why — Expo Router's static
 * web export can duplicate a plain module singleton across per-route
 * JS bundles, silently breaking cross-screen communication like this.
 */

type Listener = (code: string) => void;

type NetworkStoreState = {
  currentNetwork: string;
  listeners: Set<Listener>;
};

const KEY = "__cwaaxNetworkStore";

function getStore(): NetworkStoreState {
  const g = globalThis as unknown as Record<string, NetworkStoreState>;
  if (!g[KEY]) {
    g[KEY] = { currentNetwork: "TRC20", listeners: new Set() };
  }
  return g[KEY];
}

export function getSelectedNetwork(): string {
  return getStore().currentNetwork;
}

export function setSelectedNetwork(code: string) {
  const store = getStore();
  store.currentNetwork = code;
  store.listeners.forEach((l) => l(code));
}

export function subscribeNetwork(listener: Listener): () => void {
  const store = getStore();
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}
