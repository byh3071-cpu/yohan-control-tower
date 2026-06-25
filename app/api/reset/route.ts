/** POST /api/reset — 4개 컬렉션 재생성(데이터 전체 삭제). 파괴적 — UI 에서 확인 후 호출. */
import { ALL_COLLECTIONS } from '@/lib/sources'
import { recreateCollection } from '@/lib/qdrant'

export const runtime = 'nodejs'

export async function POST(): Promise<Response> {
  try {
    for (const c of ALL_COLLECTIONS) await recreateCollection(c)
    return Response.json({ ok: true, reset: ALL_COLLECTIONS })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
