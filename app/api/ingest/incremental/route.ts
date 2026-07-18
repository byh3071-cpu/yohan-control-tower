/** POST /api/ingest/incremental — 전 소스 증분 인제스트(Qdrant sinceDate). */
import { ingestAllIncremental } from '@/lib/ingest'

export const runtime = 'nodejs'
export const maxDuration = 600

export async function POST(): Promise<Response> {
  try {
    const results = await ingestAllIncremental()
    return Response.json({ results })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return Response.json({ error: message }, { status: 500 })
  }
}
