import { NextResponse } from "next/server"
import { resolve } from "node:path"
import { config } from "dotenv"

export const dynamic = "force-dynamic"

config({ path: resolve(/* turbopackIgnore: true */ process.cwd(), "..", ".env") })

/** POST 본문 필드 (고정 스키마 — §10.11) */
export type SotDraftGenerateBody = {
  /** 저장 예정 주제 한 줄 */
  topic: string
  /** 추가 맥락(붙여넣기 허용) */
  context?: string
  /** 초안 톤·절 구조 */
  template?: "insight" | "decision" | "plan"
}

const INSIGHT_DRAFT_RULES = `마크다운 본문만. 코드펜스 금지. 한국어. 미사여구 금지.
섹션 순서(제목은 # 한 번만, 나머지 ##):
# {주제에 맞는 제목}
## 목적 — 이 노트를 언제 다시 열지 한 문장
## 요약 — 짧은 문단 2~4개. 첫 문장에 결론·주장. 요약을 불릿 키워드만으로 채우지 말 것. 사실과 해석 분리; 불확실하면 「확인 필요」
## 출처·원문 — 상대 경로·URL·붙여넣은 맥락 출처
## 본문 — 논지·단계·증거
## 적용·주의 — Yohan OS 또는 본인 워크플로에 걸리는 점
## 다음 액션 (선택)
수치·연도·제품명은 사용자 맥락에 있을 때만 쓰고, 없으면 만들지 말 것.`

const TEMPLATE_HINT: Record<NonNullable<SotDraftGenerateBody["template"]>, string> = {
  insight: INSIGHT_DRAFT_RULES,
  decision:
    "## 맥락\n## 결정\n## 근거\n## 리스크·후속\n 형식. 한국어, 팩트 위주.",
  plan:
    "## 목표\n## 단계(1. 2. …)\n## 완료 조건\n 형식. 한국어.",
}

async function callOpenAIDraft(
  topic: string,
  context: string,
  template: NonNullable<SotDraftGenerateBody["template"]>
): Promise<{ text: string; ok: true } | { error: string; ok: false }> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return { ok: false, error: "NO_API_KEY" }

  const sys = `Yohan OS memory 저장용 초안 작성기. ${TEMPLATE_HINT[template]}`
  const user = `주제:\n${topic}\n\n추가 맥락:\n${context || "(없음)"}\n\n본문만 출력(코드펜스 금지).`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.35,
      max_tokens: 1400,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { ok: false, error: `openai_http_${res.status}: ${err.slice(0, 200)}` }
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, error: "empty_completion" }
  }
  return { ok: true, text: text.trim() }
}

function stubDraft(topic: string, template: NonNullable<SotDraftGenerateBody["template"]>): string {
  const head =
    template === "decision"
      ? "## 맥락\n\n## 결정\n\n## 근거\n\n## 리스크·후속\n"
      : template === "plan"
        ? "## 목표\n\n## 단계\n\n1. \n2. \n\n## 완료 조건\n\n"
        : "## 목적\n\n## 요약\n\n(문단 2~4개. 불릿만으로 채우지 말 것.)\n\n## 출처·원문\n\n## 본문\n\n## 적용·주의\n\n## 다음 액션\n\n"

  return `# ${topic}\n\n> OPENAI_API_KEY 없음 또는 오류 시 틀. 품질 기준: memory/rules/insight-summary-quality.md\n\n${head}\n`
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 })
  }

  const o = body as Record<string, unknown>
  const topic = o.topic
  const context = o.context
  const templateRaw = o.template

  if (typeof topic !== "string" || topic.trim().length < 1 || topic.length > 400) {
    return NextResponse.json(
      { ok: false, error: "topic_required_string_1_400" },
      { status: 400 }
    )
  }

  if (context !== undefined && (typeof context !== "string" || context.length > 12000)) {
    return NextResponse.json({ ok: false, error: "context_optional_string_max_12000" }, { status: 400 })
  }

  let template: NonNullable<SotDraftGenerateBody["template"]> = "insight"
  if (templateRaw !== undefined) {
    if (templateRaw !== "insight" && templateRaw !== "decision" && templateRaw !== "plan") {
      return NextResponse.json(
        { ok: false, error: "template_must_be_insight_decision_plan" },
        { status: 400 }
      )
    }
    template = templateRaw
  }

  const ctx = typeof context === "string" ? context : ""

  const ai = await callOpenAIDraft(topic.trim(), ctx, template)
  if (ai.ok) {
    return NextResponse.json({
      ok: true,
      draft: ai.text,
      source: "openai",
      template,
    })
  }

  if (ai.error === "NO_API_KEY") {
    return NextResponse.json({
      ok: true,
      draft: stubDraft(topic.trim(), template),
      source: "stub",
      template,
      hint: "OPENAI_API_KEY 없음 — 틀만 반환",
    })
  }

  return NextResponse.json(
    {
      ok: true,
      draft: stubDraft(topic.trim(), template),
      source: "stub",
      template,
      hint: `OpenAI 실패: ${ai.error}`,
    },
    { status: 200 }
  )
}
