import { NextResponse } from "next/server"
import { getDeferredQueue, getOvernightSummaries } from "@/lib/audits"

export const dynamic = "force-dynamic"

export async function GET() {
  const generatedAt = new Date().toISOString()
  try {
    const [summaries, deferred] = await Promise.all([
      getOvernightSummaries(2),
      getDeferredQueue(),
    ])
    return NextResponse.json({ ok: true, summaries, deferred, generatedAt })
  } catch (e: unknown) {
    // getOvernightSummaries/getDeferredQueue 는 이미 내부에서 degrade 하므로 여기 도달은
    // 예상 밖 상황(권한 등)뿐 — 그래도 500 대신 ok:false 로 패널이 부드럽게 접히게 한다.
    return NextResponse.json({
      ok: false,
      summaries: [],
      deferred: { savedAt: null, count: 0, bySeverity: {}, byRepo: {} },
      error: e instanceof Error ? e.message : "밤루프 감사 로그 읽기 실패",
      generatedAt,
    })
  }
}
