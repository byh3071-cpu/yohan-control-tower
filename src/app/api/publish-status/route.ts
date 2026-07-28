import { NextResponse } from "next/server"
import { getPublishStatus } from "@/lib/publish"

export const dynamic = "force-dynamic"

export async function GET() {
  const generatedAt = new Date().toISOString()
  try {
    const status = await getPublishStatus()

    // 읽지 못한 경우를 0건과 구별해 표면화한다(ARCHITECTURE §6-⑤).
    // 예전엔 실패도 total:0 으로 내려가 "글 0편"과 구분되지 않았다.
    if (!status.available) {
      return NextResponse.json({ ok: false, available: false, error: status.reason, generatedAt })
    }

    return NextResponse.json({
      ok: true,
      available: true,
      total: status.total,
      published: status.published,
      draft: status.draft,
      latest: status.latest,
      generatedAt,
    })
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      available: false,
      error: e instanceof Error ? e.message : "발행 콘텐츠 읽기 실패",
      generatedAt,
    })
  }
}
