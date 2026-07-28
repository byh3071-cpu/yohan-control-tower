import { NextResponse } from "next/server"
import { buildConstellation } from "@/lib/constellation"
import { getDocsCached, getDocsCacheMeta, clearDocsCache } from "@/lib/docs-cache"
import { createTtlCache } from "@/lib/server-cache"
import { withNoStoreJson } from "@/lib/http-cache"

export const dynamic = "force-dynamic"

const TTL_MS = 15000
const constellationCache = createTtlCache<unknown>({ ttlMs: TTL_MS })

export async function GET(req: Request) {
  const fresh = new URL(req.url).searchParams.get("fresh") === "1"
  if (fresh) {
    clearDocsCache()
    constellationCache.clear()
  }

  const data = await constellationCache.get(async () => {
    const docs = await getDocsCached()
    return buildConstellation(docs)
  })

  const res = withNoStoreJson(NextResponse.json(data))
  const meta = constellationCache.inspect()
  const docsMeta = getDocsCacheMeta()
  res.headers.set("x-cache-constellation", meta.hit ? "hit" : "miss")
  res.headers.set("x-cache-constellation-age-ms", String(meta.ageMs ?? -1))
  res.headers.set("x-cache-docs", docsMeta.hit ? "hit" : "miss")
  return res
}
