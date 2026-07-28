import { NextResponse } from "next/server"
import { getStats, buildChartData, parseBatchHistory, pickSerendipity, getGitLog, extractDecisions, getSessionLogs, getEvaluatorRollup } from "@/lib/memory"
import { getDocsCached, getDocsCacheMeta, clearDocsCache } from "@/lib/docs-cache"
import { createTtlCache } from "@/lib/server-cache"
import { withNoStoreJson } from "@/lib/http-cache"

export const dynamic = "force-dynamic"

const PAYLOAD_TTL_MS = 8000
const payloadCache = createTtlCache<unknown>({ ttlMs: PAYLOAD_TTL_MS })

async function buildPayload() {
  const docs = await getDocsCached()
  const stats = await getStats(docs)
  const batchHistory = await parseBatchHistory()
  const baseCharts = buildChartData(docs, batchHistory)
  const charts = { ...baseCharts, evaluatorRollup: await getEvaluatorRollup() }
  const serendipity = pickSerendipity(docs)
  const changelog = await getGitLog(30)
  const decisions = extractDecisions(docs)
  const sessions = await getSessionLogs()
  return { docs, stats, charts, serendipity, changelog, decisions, sessions }
}

export async function GET(req: Request) {
  const fresh = new URL(req.url).searchParams.get("fresh") === "1"
  if (fresh) {
    clearDocsCache()
    payloadCache.clear()
  }

  const data = await payloadCache.get(buildPayload)
  const res = withNoStoreJson(NextResponse.json(data))
  const meta = payloadCache.inspect()
  const docsMeta = getDocsCacheMeta()
  res.headers.set("x-cache-payload", meta.hit ? "hit" : "miss")
  res.headers.set("x-cache-payload-age-ms", String(meta.ageMs ?? -1))
  res.headers.set("x-cache-docs", docsMeta.hit ? "hit" : "miss")
  return res
}
