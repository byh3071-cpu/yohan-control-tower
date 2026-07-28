/** POST /api/vector/ingest/keyword — 키워드 DB → knowledge_base. */
import { ingestHandler } from '@/lib/vector/ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = ingestHandler('keyword')
