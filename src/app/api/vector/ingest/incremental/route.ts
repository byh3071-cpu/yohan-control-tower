/** POST /api/vector/ingest/incremental — 전 소스 증분 인제스트(Qdrant sinceDate). */
import { ingestAllIncremental } from '@/lib/vector/ingest'
import { isSameOriginRequest } from '@/lib/inbox-controller'

export const runtime = 'nodejs'
export const maxDuration = 600

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: '로컬 same-origin 요청만 허용합니다.' }, { status: 403 })
  }
  try {
    const results = await ingestAllIncremental()
    return Response.json({ results })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return Response.json({ error: message }, { status: 500 })
  }
}
