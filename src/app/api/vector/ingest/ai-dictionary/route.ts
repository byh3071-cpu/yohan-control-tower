/** POST /api/vector/ingest/ai-dictionary — AI 사전 → knowledge_base. */
import { ingestHandler } from '@/lib/vector/ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = ingestHandler('ai-dictionary')
