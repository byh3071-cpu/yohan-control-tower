/** GET /api/status — Qdrant 연결 + 컬렉션별 건수 + Ollama/Notion 가용성. */
import type { StatusResponse, CollectionName } from '@/lib/types'
import { ALL_COLLECTIONS } from '@/lib/sources'
import { countPoints, qdrantVersion } from '@/lib/qdrant'
import { ollamaStatus } from '@/lib/ollama'
import { notionConfigured } from '@/lib/notion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const collections = Object.fromEntries(
    ALL_COLLECTIONS.map((c) => [c, 0]),
  ) as Record<CollectionName, number>

  let qdrant: StatusResponse['qdrant']
  try {
    const version = await qdrantVersion()
    for (const c of ALL_COLLECTIONS) collections[c] = await countPoints(c)
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
  }
  return Response.json(body)
}
