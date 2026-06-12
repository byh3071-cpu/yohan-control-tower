import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises"
import { existsSync } from "node:fs"
import { listDocs, getStats, parseBatchHistory, getSessionLogs, extractDecisions } from "@/lib/memory"
import { resolve, join } from "node:path"
import { config } from "dotenv"

export const dynamic = "force-dynamic"

function loadDashboardEnv() {
  const paths: [string, boolean][] = [
    [resolve(/* turbopackIgnore: true */ process.cwd(), "..", ".env"), false],
    [resolve(/* turbopackIgnore: true */ process.cwd(), "..", ".env.local"), true],
    [resolve(/* turbopackIgnore: true */ process.cwd(), ".env"), true],
    [resolve(/* turbopackIgnore: true */ process.cwd(), ".env.local"), true],
  ]
  for (const [p, override] of paths) {
    if (existsSync(p)) config({ path: p, override })
  }
}

loadDashboardEnv()

const CACHE_DIR = join(/* turbopackIgnore: true */ process.cwd(), ".next", "cache", "briefing")

interface CachedBriefing {
  date: string
  briefing: string
  generatedAt: string
  stats: { recentDocs: number; totalDocs: number; batchStatus: string }
}

async function readCache(today: string): Promise<CachedBriefing | null> {
  try {
    const raw = await readFile(
      join(/* turbopackIgnore: true */ CACHE_DIR, `${today}.json`),
      "utf8"
    )
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function writeCache(data: CachedBriefing): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(
      join(/* turbopackIgnore: true */ CACHE_DIR, `${data.date}.json`),
      JSON.stringify(data),
      "utf8"
    )
  } catch { /* best effort */ }
}

function isBriefingFailurePlaceholder(text: string): boolean {
  return (
    text.includes("OPENAI_API_KEY 없음") ||
    text.startsWith("(OpenAI 오류:")
  )
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return "(OPENAI_API_KEY 없음 — 브리핑 생성 불가)"

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "너는 Yohan OS 개인 비서야. 한국어로 간결하게 브리핑해. 불릿 형식, 미사여구 없이 팩트 위주." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 600,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return `(OpenAI 오류: ${res.status} ${err.slice(0, 100)})`
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? "(응답 없음)"
}

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const forceRefresh = url.searchParams.get("refresh") === "1"

  const today = new Date().toISOString().slice(0, 10)

  if (!forceRefresh) {
    const cached = await readCache(today)
    if (cached) {
      const key = process.env.OPENAI_API_KEY?.trim()
      const failed = isBriefingFailurePlaceholder(cached.briefing)
      if (!failed) {
        return NextResponse.json({ ...cached, cached: true })
      }
      if (failed && !key) {
        return NextResponse.json({ ...cached, cached: true })
      }
      await unlink(
        join(/* turbopackIgnore: true */ CACHE_DIR, `${today}.json`)
      ).catch(() => { /* stale error cache */ })
    }
  }

  const docs = await listDocs()
  const stats = await getStats(docs)
  const batch = await parseBatchHistory()
  const sessions = await getSessionLogs()
  const decisions = extractDecisions(docs)

  const recentDocs = docs.filter((d) => d.date === today || d.date === getYesterday())
  const recentDecisions = decisions.slice(-3)
  const lastSession = sessions[0]
  const lastBatch = batch[batch.length - 1]

  const prompt = `오늘 날짜: ${today}

## 시스템 현황
- 총 문서: ${stats.totalDocs}건, 인제스트: ${stats.ingests}건, 결정: ${stats.decisions}건
- 배치 상태: ${stats.batchStatus}, 마지막 실행: ${stats.batchLastRun ?? "없음"}
${lastBatch ? `- 배치 최근: 성공 ${lastBatch.ok}회, 실패 ${lastBatch.fail}회` : ""}

## 최근 24시간 인제스트 (${recentDocs.length}건)
${recentDocs.slice(0, 8).map((d) => `- [${d.category}] ${d.title}`).join("\n") || "- 없음"}

## 최근 결정
${recentDecisions.map((d) => `- ${d.date}: ${d.title}`).join("\n") || "- 없음"}

## 마지막 세션
${lastSession ? `- ${lastSession.date}: ${lastSession.summary.join(", ")}` : "- 세션 로그 없음"}

---

위 데이터를 기반으로 아래 3섹션으로 브리핑을 작성해:

1. **어제 요약** (2~3줄) — 무슨 작업이 있었는지
2. **확인 필요** (0~2줄) — 오류, 실패, 주의가 필요한 항목. 없으면 "없음"
3. **오늘 제안** (1~2줄) — 다음으로 하면 좋을 작업`

  const briefing = await callOpenAI(prompt)

  const result: CachedBriefing = {
    date: today,
    briefing,
    generatedAt: new Date().toISOString(),
    stats: {
      recentDocs: recentDocs.length,
      totalDocs: stats.totalDocs,
      batchStatus: stats.batchStatus,
    },
  }

  if (!isBriefingFailurePlaceholder(briefing)) {
    await writeCache(result)
  }

  return NextResponse.json({ ...result, cached: false })
}
