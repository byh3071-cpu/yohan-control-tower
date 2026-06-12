export interface TtlCacheOptions {
  ttlMs: number
}

/**
 * Small in-memory TTL cache with inflight dedupe for server routes.
 * Scope is per Next.js process (dev/prod worker).
 */
export function createTtlCache<T>(options: TtlCacheOptions) {
  let cache: { at: number; value: T } | null = null
  let inflight: Promise<T> | null = null

  async function get(load: () => Promise<T>): Promise<T> {
    const now = Date.now()
    if (cache && now - cache.at < options.ttlMs) return cache.value
    if (inflight) return inflight

    inflight = load()
      .then((value) => {
        cache = { at: Date.now(), value }
        return value
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  function clear() {
    cache = null
    inflight = null
  }

  function inspect() {
    const now = Date.now()
    const ageMs = cache ? now - cache.at : null
    return {
      hasValue: Boolean(cache),
      ageMs,
      ttlMs: options.ttlMs,
      inflight: Boolean(inflight),
      hit: Boolean(cache && ageMs !== null && ageMs < options.ttlMs),
    }
  }

  return { get, clear, inspect }
}

