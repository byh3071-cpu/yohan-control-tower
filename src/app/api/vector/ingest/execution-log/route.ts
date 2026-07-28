/** POST /api/vector/ingest/execution-log — EXECUTION LOG → execution_history. */
import { ingestHandler } from '@/lib/vector/ingest'

export const runtime = 'nodejs'
export const maxDuration = 600

export const POST = ingestHandler('execution-log')
