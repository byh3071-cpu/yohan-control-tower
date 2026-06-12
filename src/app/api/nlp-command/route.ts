import { NextRequest, NextResponse } from "next/server"
import { listDocs } from "@/lib/memory"
import { resolve } from "node:path"
import { config } from "dotenv"

export const dynamic = "force-dynamic"

config({ path: resolve(/* turbopackIgnore: true */ process.cwd(), "..", ".env") })

export type NlpIntent =
  | { type: "search_docs"; query: string; dateFilter?: string }
  | { type: "run_action"; action: string; args?: string; confirm?: boolean }
  | { type: "open_view"; view: "home" | "charts" | "timeline" | "workroom" | "constellation" }
  | { type: "unknown"; raw: string }

const KNOWN_ACTIONS: Record<string, string> = {
  "ingest:url": "URL 인제스트",
  "ingest:all": "RSS 전체 수집",
  "sync:notion:push": "노션 푸시",
  "sync:notion:pull": "노션 풀",
  "report:weekly": "주간 리포트",
  "check:drift": "드리프트 점검",
  "automation:batch": "배치 즉시 실행",
  "bot:status": "봇 상태",
  build: "MCP 빌드",
  "git:sync": "Git 동기화",
}

const ACTION_LIST = Object.entries(KNOWN_ACTIONS)
  .map(([k, v]) => `${k} (${v})`)
  .join(", ")

const CLASSIFY_SYSTEM = `너는 Yohan OS 대시보드 커맨드 팔레트의 의도 분류기야.
사용자 입력을 아래 JSON 중 하나로만 반환해. 설명 없이 JSON만.

1. 문서 검색: {"type":"search_docs","query":"검색어","dateFilter":"YYYY-MM-DD 또는 yesterday 또는 today 또는 null"}
2. 빠른 실행: {"type":"run_action","action":"액션키","confirm":true}
   가능한 액션: ${ACTION_LIST}
3. 뷰 전환: {"type":"open_view","view":"home|charts|timeline|workroom|constellation"}
4. 모르겠으면: {"type":"unknown","raw":"원문"}

규칙:
- "어제" = yesterday, "오늘" = today, 특정 날짜 = YYYY-MM-DD
- "별자리" = constellation, "차트"/"통계" = charts, "타임라인" = timeline, "작업실" = workroom
- 액션은 위 목록에 있는 것만. 없으면 search_docs로.
- confirm은 실행 액션에만 true.`

function resolveDate(raw: string | null | undefined): string | undefined {
  if (!raw || raw === "null") return undefined
  const today = new Date()
  if (raw === "today") {
    return today.toISOString().slice(0, 10)
  }
  if (raw === "yesterday") {
    today.setDate(today.getDate() - 1)
    return today.toISOString().slice(0, 10)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return undefined
}

function keywordFallback(input: string): NlpIntent {
  const q = input.toLowerCase().trim()

  for (const [action] of Object.entries(KNOWN_ACTIONS)) {
    const label = KNOWN_ACTIONS[action]
    if (q.includes(label) || q.includes(action.replace(":", " "))) {
      return { type: "run_action", action, confirm: true }
    }
  }

  if (q.includes("별자리")) return { type: "open_view", view: "constellation" }
  if (q.includes("작업실")) return { type: "open_view", view: "workroom" }
  if (q.includes("차트") || q.includes("통계")) return { type: "open_view", view: "charts" }
  if (q.includes("타임라인")) return { type: "open_view", view: "timeline" }

  return { type: "search_docs", query: input }
}

export async function POST(req: NextRequest) {
  let body: { input: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const input = body.input?.trim()
  if (!input || typeof input !== "string" || input.length > 500) {
    return NextResponse.json({ error: "input required (1-500)" }, { status: 400 })
  }

  const docs = await listDocs()
  const key = process.env.OPENAI_API_KEY?.trim()

  if (!key) {
    const intent = keywordFallback(input)
    if (intent.type === "search_docs") {
      const q = (intent.query ?? input).toLowerCase()
      const results = docs
        .filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.excerpt.toLowerCase().includes(q) ||
            d.tags.some((t) => t.toLowerCase().includes(q)),
        )
        .slice(0, 8)
      return NextResponse.json({ intent, results, method: "keyword" })
    }
    return NextResponse.json({ intent, results: [], method: "keyword" })
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CLASSIFY_SYSTEM },
          { role: "user", content: input },
        ],
        temperature: 0,
        max_tokens: 200,
      }),
    })

    if (!res.ok) {
      const intent = keywordFallback(input)
      return NextResponse.json({ intent, results: [], method: "keyword-fallback" })
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content ?? ""
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ intent: keywordFallback(input), results: [], method: "keyword-fallback" })
    }

    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    const t = parsed.type

    if (t === "run_action") {
      const action = String(parsed.action ?? "")
      if (!KNOWN_ACTIONS[action]) {
        return NextResponse.json({
          intent: { type: "search_docs", query: input } as NlpIntent,
          results: [],
          method: "ai-corrected",
        })
      }
      const intent: NlpIntent = {
        type: "run_action",
        action,
        args: typeof parsed.args === "string" ? parsed.args : undefined,
        confirm: true,
      }
      return NextResponse.json({ intent, results: [], method: "ai" })
    }

    if (t === "open_view") {
      const view = String(parsed.view ?? "home")
      const allowed = ["home", "charts", "timeline", "workroom", "constellation"]
      const intent: NlpIntent = {
        type: "open_view",
        view: (allowed.includes(view) ? view : "home") as "home" | "charts" | "timeline" | "workroom" | "constellation",
      }
      return NextResponse.json({ intent, results: [], method: "ai" })
    }

    if (t === "search_docs") {
      const query = String(parsed.query ?? input)
      const dateFilter = resolveDate(parsed.dateFilter as string | null)
      const q = query.toLowerCase()
      let pool = docs
      if (dateFilter) {
        pool = docs.filter((d) => d.date === dateFilter)
      }
      const results = pool
        .filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.excerpt.toLowerCase().includes(q) ||
            d.tags.some((tag) => tag.toLowerCase().includes(q)),
        )
        .slice(0, 12)

      if (results.length === 0 && dateFilter) {
        const dateOnly = pool.slice(0, 12)
        return NextResponse.json({
          intent: { type: "search_docs", query, dateFilter } as NlpIntent,
          results: dateOnly,
          method: "ai-date",
        })
      }

      return NextResponse.json({
        intent: { type: "search_docs", query, dateFilter } as NlpIntent,
        results,
        method: dateFilter ? "ai-date" : "ai",
      })
    }

    return NextResponse.json({
      intent: { type: "unknown", raw: input } as NlpIntent,
      results: [],
      method: "ai",
    })
  } catch {
    const intent = keywordFallback(input)
    return NextResponse.json({ intent, results: [], method: "keyword-fallback" })
  }
}
