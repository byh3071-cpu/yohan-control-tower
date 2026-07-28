/** POST /api/vector/ingest/rulebook — RULEBOOK → system_rules. */
import { ingestHandler } from '@/lib/vector/ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = ingestHandler('rulebook')
