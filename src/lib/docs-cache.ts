import { listDocs, type DocMeta } from "@/lib/memory"
import { createTtlCache } from "@/lib/server-cache"

const DOCS_TTL_MS = 15000
const docsCache = createTtlCache<DocMeta[]>({ ttlMs: DOCS_TTL_MS })

export async function getDocsCached(): Promise<DocMeta[]> {
  return docsCache.get(() => listDocs())
}

export function getDocsCacheMeta() {
  return docsCache.inspect()
}

export function clearDocsCache() {
  docsCache.clear()
}

