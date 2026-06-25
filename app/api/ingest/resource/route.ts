/** POST /api/ingest/resource — RESOURCE DB → semantic_cache. */
import { ingestHandler } from '@/lib/ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = ingestHandler('resource')
