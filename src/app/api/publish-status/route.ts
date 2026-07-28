import { NextResponse } from "next/server"
import { getPublishStatus } from "@/lib/publish"

export const dynamic = "force-dynamic"

export async function GET() {
  const generatedAt = new Date().toISOString()
  try {
    const status = await getPublishStatus()
    return NextResponse.json({ ok: true, ...status, generatedAt })
  } catch (e: unknown) {
    // getPublishStatus 는 형제 레포 부재/파싱 실패를 이미 내부에서 degrade 하므로 여기 도달은
    // 예상 밖 상황뿐 — 그래도 500 대신 ok:false 로 패널이 부드럽게 접히게 한다.
    return NextResponse.json({
      ok: false,
      total: 0,
      published: 0,
      draft: 0,
      latest: [],
      error: e instanceof Error ? e.message : "발행 콘텐츠 읽기 실패",
      generatedAt,
    })
  }
}
