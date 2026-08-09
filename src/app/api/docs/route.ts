import { NextResponse } from "next/server"
import { getStats, buildChartData, parseBatchHistory, getGitLog, extractDecisions, getSessionLogs, getEvaluatorRollup } from "@/lib/memory"
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
  const changelog = await getGitLog(30)
  const decisions = extractDecisions(docs)
  const sessions = await getSessionLogs()
  return { docs, stats, charts, changelog, decisions, sessions }
}

export async function GET(req: Request) {
  try {
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
  } catch (error: unknown) {
    console.error("[GET /api/docs]", error instanceof Error ? error.message : String(error))
    return withNoStoreJson(NextResponse.json({
      error: "Yohan Brain 연결이 필요합니다. 설정에서 Brain 폴더를 연결한 뒤 다시 시도하세요.",
      setupRequired: true,
    }, { status: 503 }))
  }
}
