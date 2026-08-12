/** POST /api/vector/query — { collection, query, topK? } → 벡터 검색 결과. */
import type { CollectionName, QueryResponse } from '@/lib/vector/types'
import { ALL_COLLECTIONS } from '@/lib/vector/sources'
import { embed } from '@/lib/vector/ollama'
import { searchCollection } from '@/lib/vector/qdrant'
import { InboxInputError, isSameOriginRequest, readRequestTextWithinLimit } from '@/lib/inbox-controller'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_QUERY_CHARS = 4_000
const MAX_QUERY_REQUEST_BYTES = 16 * 1024

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: '로컬 same-origin 요청만 허용합니다.' }, { status: 403 })
  }
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return Response.json({ error: 'Content-Type은 application/json이어야 합니다.' }, { status: 415 })
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_QUERY_REQUEST_BYTES) {
    return Response.json({ error: '요청 본문이 너무 큽니다.' }, { status: 413 })
  }

  try {
    const raw = await readRequestTextWithinLimit(request, MAX_QUERY_REQUEST_BYTES)
    let body: unknown
    try {
      body = JSON.parse(raw) as unknown
    } catch {
      return Response.json({ error: '올바른 JSON 본문이 필요합니다.' }, { status: 400 })
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return Response.json({ error: 'JSON 객체가 필요합니다.' }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const collection = typeof payload.collection === 'string' ? payload.collection : ''
    const query = typeof payload.query === 'string' ? payload.query.trim() : ''
    if (!collection || !query) {
      return Response.json({ error: 'collection·query는 필수입니다.' }, { status: 400 })
    }
    if (query.length > MAX_QUERY_CHARS) {
      return Response.json({ error: `query는 ${MAX_QUERY_CHARS}자 이하여야 합니다.` }, { status: 400 })
    }
    if (!ALL_COLLECTIONS.includes(collection as CollectionName)) {
      return Response.json({ error: `알 수 없는 컬렉션: ${collection}` }, { status: 400 })
    }

    const requestedTopK = typeof payload.topK === 'number' && Number.isFinite(payload.topK)
      ? payload.topK
      : 5
    const topK = Math.max(1, Math.min(100, Math.trunc(requestedTopK)))
    const safeCollection = collection as CollectionName
    const vector = await embed(query)
    const hits = await searchCollection(safeCollection, vector, topK)
    const response: QueryResponse = { collection: safeCollection, query, hits }
    return Response.json(response)
  } catch (error) {
    if (error instanceof InboxInputError) {
      return Response.json({ error: error.message }, { status: 413 })
    }
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
