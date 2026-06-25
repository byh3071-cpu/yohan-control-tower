/** POST /api/ingest/all — Tier 1 전체(AI 사전·PROTOCOL·RULEBOOK) 순차 인제스트. */
import { ingestTierHandler } from '@/lib/ingest'

export const runtime = 'nodejs'
export const maxDuration = 600

export const POST = ingestTierHandler(1)
