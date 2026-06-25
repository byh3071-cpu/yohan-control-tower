/** POST /api/ingest/summary — SUMMARY DB → knowledge_base. */
import { ingestHandler } from '@/lib/ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = ingestHandler('summary')
