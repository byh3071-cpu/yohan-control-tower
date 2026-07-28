/** GET /api/vector/status — Qdrant 연결 + 컬렉션별 건수 + 소스별 last_edited_time + Ollama/Notion. */
import type { StatusResponse, CollectionName, SourceDb } from '@/lib/vector/types'
import { ALL_COLLECTIONS, SOURCES } from '@/lib/vector/sources'
import { countPoints, qdrantVersion, getMaxLastEditedTime } from '@/lib/vector/qdrant'
import { ollamaStatus } from '@/lib/vector/ollama'
import { notionConfigured } from '@/lib/vector/notion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const collections = Object.fromEntries(
    ALL_COLLECTIONS.map((c) => [c, 0]),
  ) as Record<CollectionName, number>

  const sources = Object.fromEntries(SOURCES.map((s) => [s.source, null])) as Record<
    SourceDb,
    string | null
  >

  let qdrant: StatusResponse['qdrant']
  try {
    const version = await qdrantVersion()
    for (const c of ALL_COLLECTIONS) collections[c] = await countPoints(c)
    for (const s of SOURCES) {
      sources[s.source] = await getMaxLastEditedTime(s.collection, s.source)
    }
    qdrant = { connected: true, version }
  } catch (e) {
    qdrant = { connected: false, error: e instanceof Error ? e.message : String(e) }
  }

  const ollama = await ollamaStatus()

  const body: StatusResponse = {
    qdrant,
    ollama,
    notion: { configured: notionConfigured() },
    collections,
    sources,
  }
  return Response.json(body)
}
