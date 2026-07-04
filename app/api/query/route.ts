/** POST /api/query — { collection, query, topK? } → 벡터 검색 결과. */
import type { CollectionName, QueryResponse } from '@/lib/types'
import { ALL_COLLECTIONS } from '@/lib/sources'
import { embed } from '@/lib/ollama'
import { searchCollection } from '@/lib/qdrant'

export const runtime = 'nodejs'
// 검색 hot-path 상한. embed+search 가 타임아웃 없이 매달리는 최악을 라우트 레벨에서도 차단.
export const maxDuration = 60

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      collection?: CollectionName
      query?: string
      topK?: number
    }
    const collection = body.collection
    const query = body.query?.trim()
    // topK 검증: 음수·0·과대값(예 10000) 무방비 전달 방지 — 1~100 클램프
    const topK = Math.max(1, Math.min(100, Number(body.topK) || 5))

    if (!collection || !query) {
      return Response.json({ error: 'collection·query 는 필수입니다' }, { status: 400 })
    }
    if (!ALL_COLLECTIONS.includes(collection)) {
      return Response.json({ error: `알 수 없는 컬렉션: ${collection}` }, { status: 400 })
    }

    const vector = await embed(query)
    const hits = await searchCollection(collection, vector, topK)
    const res: QueryResponse = { collection, query, hits }
    return Response.json(res)
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
