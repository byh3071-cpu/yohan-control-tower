/**
 * P1 로컬 증분 인제스트 cron — Windows 작업스케줄러가 매시간 실행.
 * 노션 변경분(Qdrant max last_edited_time 이후)만 → Qdrant upsert.
 * Vercel cron(vercel.json)의 로컬 대체 — Qdrant 가 localhost 인 현 환경용.
 * (장기: Qdrant 클라우드 이전 후 Vercel cron 으로 승격)
 *
 * 실행: npx tsx scripts/incremental-cron.ts   (cwd = control-tower 루트)
 */
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

async function main() {
  const started = new Date().toISOString()
  console.log(`[incremental-cron] 시작 ${started}`)
  const { ingestAllIncremental } = await import('../lib/ingest')
  const results = await ingestAllIncremental()
  const upserted = Array.isArray(results)
    ? results.reduce((a: number, r: { upserted?: number }) => a + (r?.upserted ?? 0), 0)
    : 0
  console.log(`[incremental-cron] 완료 ${new Date().toISOString()} — upsert ${upserted}건`)
  console.log(JSON.stringify(results))
}

main().catch((e) => {
  console.error('[incremental-cron] FAIL:', (e && e.message) || e)
  process.exitCode = 1
})
