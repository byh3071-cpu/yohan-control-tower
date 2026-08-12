/** POST /api/vector/reset — 4개 컬렉션 재생성(데이터 전체 삭제). 파괴적 — UI에서 확인 후 호출. */
import { isSameOriginRequest } from '@/lib/inbox-controller'
import { recreateCollection } from '@/lib/vector/qdrant'
import { ALL_COLLECTIONS } from '@/lib/vector/sources'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: '로컬 same-origin 요청만 허용합니다.' }, { status: 403 })
  }

  try {
    for (const collection of ALL_COLLECTIONS) await recreateCollection(collection)
    return Response.json({ ok: true, reset: ALL_COLLECTIONS })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
