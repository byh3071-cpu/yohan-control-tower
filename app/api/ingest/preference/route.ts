/** POST /api/ingest/preference — 취향 DB → system_rules. */
import { ingestHandler } from '@/lib/ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = ingestHandler('preference')
