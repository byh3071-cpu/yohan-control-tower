export interface TtlCacheOptions {
  ttlMs: number
  /**
   * 외부 파일 상태를 대표하는 짧은 스탬프. TTL 안이어도 값이 달라지면 다시 읽는다.
   * 파일 본문 대신 mtime·디렉터리 목록처럼 값싼 메타데이터만 사용해야 한다.
   */
  validate?: () => Promise<string>
}

/**
 * Small in-memory TTL cache with inflight dedupe for server routes.
 * Scope is per Next.js process (dev/prod worker).
 */
export function createTtlCache<T>(options: TtlCacheOptions) {
  let cache: { at: number; value: T; stamp: string | null } | null = null
  let inflight: { stamp: string | null; promise: Promise<T> } | null = null
  let generation = 0

  async function get(load: () => Promise<T>): Promise<T> {
    const stamp = options.validate ? await options.validate() : null
    const now = Date.now()
    if (cache && cache.stamp === stamp && now - cache.at < options.ttlMs) return cache.value
    if (inflight?.stamp === stamp) return inflight.promise

    const currentGeneration = ++generation
    const promise = load()
      .then((value) => {
        // 서로 다른 스탬프의 로드가 겹치면 가장 나중 요청만 캐시에 남긴다.
        if (currentGeneration === generation) cache = { at: Date.now(), value, stamp }
        return value
      })
      .finally(() => {
        if (inflight?.promise === promise) inflight = null
      })
    inflight = { stamp, promise }
    return promise
  }

  function clear() {
    // 진행 중인 이전 load가 나중에 완료돼 clear 직후 캐시를 되살리지 못하게 한다.
    generation += 1
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
      inflight: Boolean(inflight?.promise),
      hit: Boolean(cache && ageMs !== null && ageMs < options.ttlMs),
    }
  }

  return { get, clear, inspect }
}
