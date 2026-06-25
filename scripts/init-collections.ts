/**
 * Qdrant 컬렉션 4종 생성 스크립트 (Step 1).
 * 실행: npm run init:collections
 *
 * 비용 0: Qdrant 로컬(localhost:6333)만 사용. 외부 호출 없음.
 * 멱등: 이미 있으면 건너뛴다.
 */
import { ensureAllCollections, countPoints, qdrantVersion } from '../lib/qdrant'
import { COLLECTIONS } from '../lib/collections'

async function main(): Promise<void> {
  console.log('▶ Qdrant 연결 확인...')
  const version = await qdrantVersion()
  console.log(`  Qdrant version: ${version}`)

  console.log('▶ 컬렉션 보장(없으면 생성, 768차원 · Cosine)...')
  const { created, existing } = await ensureAllCollections()
  if (created.length > 0) console.log(`  생성됨: ${created.join(', ')}`)
  if (existing.length > 0) console.log(`  기존 유지: ${existing.join(', ')}`)

  console.log('▶ 현재 상태:')
  for (const def of COLLECTIONS) {
    const count = await countPoints(def.name)
    console.log(`  - ${def.name.padEnd(20)} ${count}건   (${def.purpose})`)
  }
  console.log('✅ 완료.')
}

main().catch((err: unknown) => {
  console.error('❌ 실패:', err instanceof Error ? err.message : err)
  console.error('   Qdrant가 안 떠 있으면: docker start qdrant (또는 docker run ...)')
  process.exit(1)
})
