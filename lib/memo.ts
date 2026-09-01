/**
 * Tiny per-instance TTL cache for read-mostly, cross-tenant queries (the
 * national counters, the directory). Serverless instances each keep their
 * own copy; staleness is bounded by the TTL.
 */
const store = new Map<string, { at: number; value: unknown; pending?: Promise<unknown> }>();

export function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): () => Promise<T> {
  return async () => {
    const now = Date.now();
    const hit = store.get(key);
    if (hit && now - hit.at < ttlMs) return hit.value as T;
    if (hit?.pending) return hit.pending as Promise<T>;
    const pending = fn().then((value) => {
      store.set(key, { at: Date.now(), value });
      return value;
    });
    store.set(key, { at: hit?.at ?? 0, value: hit?.value, pending });
    try {
      return await pending;
    } catch (e) {
      store.delete(key);
      throw e;
    }
  };
}

/** Forget a cached value (e.g. after a new shul is created). */
export function forget(key: string) {
  store.delete(key);
}
