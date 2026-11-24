/**
 * Global queue for the app's styled alert/confirm dialogs (see
 * components/alert-host.tsx + components/cwaax-ui.tsx's ConfirmModal).
 * notify()/confirmAsync() in native-alert.ts push requests here instead
 * of calling window.alert/window.confirm or Alert.alert, so every part
 * of the app gets the same nicely designed card with zero call-site
 * changes. Follows the same simple pub-sub pattern as network-store.ts.
 *
 * IMPORTANT: state lives on `globalThis`, not in module-level `let`
 * variables. Expo Router's static web export code-splits each route
 * into its own JS bundle; a plain module-level singleton can end up
 * duplicated — one copy per bundle — so a call from e.g. send.tsx's
 * bundle would silently update a *different* copy than the one
 * <AlertHost/> (mounted in the root layout) is subscribed to, and the
 * dialog would never appear even though pushAlert() ran with no error.
 * `globalThis` is the one thing guaranteed to be the same object no
 * matter how many times this module gets evaluated.
 */

export type AlertRequest = {
  id: number;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string; // present => two-button confirm dialog
  danger?: boolean;
  resolve: (value: boolean) => void;
};

type Listener = () => void;

type AlertStoreState = {
  current: AlertRequest | null;
  queue: AlertRequest[];
  listeners: Set<Listener>;
  nextId: number;
};

const KEY = "__cwaaxAlertStore";

function getStore(): AlertStoreState {
  const g = globalThis as unknown as Record<string, AlertStoreState>;
  if (!g[KEY]) {
    g[KEY] = { current: null, queue: [], listeners: new Set(), nextId: 1 };
  }
  return g[KEY];
}

function emit() {
  getStore().listeners.forEach((l) => l());
}

function pump() {
  const store = getStore();
  if (!store.current && store.queue.length) {
    store.current = store.queue.shift()!;
    emit();
  }
}

export function getCurrentAlert(): AlertRequest | null {
  return getStore().current;
}

export function subscribeAlert(listener: Listener): () => void {
  const store = getStore();
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

export function pushAlert(req: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const store = getStore();
    store.queue.push({ ...req, id: store.nextId++, resolve });
    pump();
  });
}

export function resolveCurrentAlert(value: boolean) {
  const store = getStore();
  if (!store.current) return;
  const { resolve } = store.current;
  store.current = null;
  emit();
  resolve(value);
  pump();
}
