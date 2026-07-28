/** POST /api/vector/ingest/knowledge-hub — 요한 지식 허브 → knowledge_base. */
import { ingestHandler } from '@/lib/vector/ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = ingestHandler('knowledge-hub')
