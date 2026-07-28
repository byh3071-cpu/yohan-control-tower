/** POST /api/vector/ingest/retrospect — RETROSPECT → execution_history. */
import { ingestHandler } from '@/lib/vector/ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = ingestHandler('retrospect')
