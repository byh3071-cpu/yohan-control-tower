/** POST /api/ingest/constitution — 헌법 8조(페이지) → system_rules (조별 청킹은 Step 7). */
import { ingestHandler } from '@/lib/ingest'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = ingestHandler('constitution')
