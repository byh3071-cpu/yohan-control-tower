/** POST /api/ingest/person — 인물 DB → knowledge_base (6섹션 청킹은 Step 7에서 정교화). */
import { ingestHandler } from '@/lib/ingest'

export const runtime = 'nodejs'
export const maxDuration = 600

export const POST = ingestHandler('person')
