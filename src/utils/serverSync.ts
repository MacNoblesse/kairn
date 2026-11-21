import { apiUrl } from './apiBase';

/**
 * Client de persistance serveur (GET/PUT /api/state).
 * Les données vivent dans le volume Docker du serveur ; localStorage ne sert que de cache
 * de secours quand le serveur est injoignable.
 */

export interface ServerDoc {
  rev: number;
  updatedAt: string | null;
  state: Record<string, unknown> | null;
}

export type PushResult =
  | { ok: true; rev: number }
  | { ok: false; conflict: true; doc: ServerDoc }
  | { ok: false; conflict: false };

const TIMEOUT_MS = 6000;

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(apiUrl(path), { ...init, signal: ctrl.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

/** `null` si le serveur est injoignable. */
export async function fetchServerDoc(): Promise<ServerDoc | null> {
  try {
    const res = await request('/api/state');
    if (!res.ok) return null;
    return (await res.json()) as ServerDoc;
  } catch {
    return null;
  }
}

export async function pushServerState(baseRev: number, state: unknown): Promise<PushResult> {
  try {
    const res = await request('/api/state', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ baseRev, state }),
    });
    if (res.status === 409) {
      return { ok: false, conflict: true, doc: (await res.json()) as ServerDoc };
    }
    if (!res.ok) return { ok: false, conflict: false };
    const body = (await res.json()) as { rev: number };
    return { ok: true, rev: body.rev };
  } catch {
    return { ok: false, conflict: false };
  }
}

// ---- Cache local + marqueur « modifications non envoyées » ----

export const STATE_STORAGE_KEY = 'kairn_app_state_v2';
const META_KEY = 'kairn_sync_meta_v1';

export interface SyncMeta {
  baseRev: number | null;
  dirty: boolean;
}

export function readSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as Partial<SyncMeta>;
      return { baseRev: typeof m.baseRev === 'number' ? m.baseRev : null, dirty: m.dirty === true };
    }
  } catch {
    // ignore
  }
  return { baseRev: null, dirty: false };
}

export function writeSyncMeta(meta: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // quota / mode privé : sans conséquence, le serveur reste la référence
  }
}
