/**
 * Qdrant 클라이언트 래퍼.
 * - 컬렉션 보장(없으면 생성) · upsert(배치) · count · search
 * - 포인트 ID는 (notion_page_id + chunk_index)에서 결정적으로 생성 → 재인제스트 멱등.
 */
import { QdrantClient } from '@qdrant/js-client-rest'
import { createHash } from 'node:crypto'
import { VECTOR_SIZE, DISTANCE, COLLECTION_NAMES } from './collections'
import type { CollectionName, QdrantPoint, SearchHit, PointPayload } from './types'

const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333'

let client: QdrantClient | null = null

export function getQdrant(): QdrantClient {
  if (!client) client = new QdrantClient({ url: QDRANT_URL })
  return client
}

/**
 * 결정적 포인트 ID. 같은 페이지·같은 청크면 항상 같은 UUID → upsert가 덮어쓰기(멱등).
 * 버전/변형 비트를 RFC 엄격 준수하진 않지만 Qdrant UUID 파서가 허용하는 형식이다.
 */
export function pointId(notionPageId: string, chunkIndex: number): string {
  const h = createHash('sha1').update(`${notionPageId}:${chunkIndex}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

/** 현재 존재하는 컬렉션 이름 목록. */
export async function listCollections(): Promise<string[]> {
  const res = await getQdrant().getCollections()
  return res.collections.map((c) => c.name)
}

/** 컬렉션의 벡터 차원 조회. 미존재/조회실패 시 null. */
async function collectionVectorSize(name: CollectionName): Promise<number | null> {
  try {
    const info = await getQdrant().getCollection(name)
    const vectors = (info as { config?: { params?: { vectors?: unknown } } }).config?.params?.vectors
    if (vectors && typeof vectors === 'object' && 'size' in vectors) {
      const size = (vectors as { size?: unknown }).size
      return typeof size === 'number' ? size : null
    }
    return null
  } catch {
    return null
  }
}

/**
 * 컬렉션 4종 보장. 없으면 생성, 차원이 VECTOR_SIZE 와 다르면 재생성(자가치유).
 * 차원 변경(768→1024 등) 시 멱등 마이그레이션. 데이터가 있으면 재생성=삭제이므로 주의.
 */
export async function ensureAllCollections(): Promise<{
  created: string[]
  recreated: string[]
  kept: string[]
}> {
  const qc = getQdrant()
  const existing = await listCollections()
  const created: string[] = []
  const recreated: string[] = []
  const kept: string[] = []
  for (const name of COLLECTION_NAMES) {
    if (!existing.includes(name)) {
      await qc.createCollection(name, { vectors: { size: VECTOR_SIZE, distance: DISTANCE } })
      created.push(name)
      continue
    }
    const size = await collectionVectorSize(name)
    if (size !== null && size !== VECTOR_SIZE) {
      await qc.deleteCollection(name)
      await qc.createCollection(name, { vectors: { size: VECTOR_SIZE, distance: DISTANCE } })
      recreated.push(name)
    } else {
      kept.push(name)
    }
  }
  return { created, recreated, kept }
}

/** 컬렉션 재생성(삭제 후 생성) — 관제탑 "초기화" 용도. */
export async function recreateCollection(name: CollectionName): Promise<void> {
  const qc = getQdrant()
  if ((await listCollections()).includes(name)) await qc.deleteCollection(name)
  await qc.createCollection(name, { vectors: { size: VECTOR_SIZE, distance: DISTANCE } })
}

/** 포인트 배치 upsert(대량 시 64개 단위로 분할). */
export async function upsertPoints(name: CollectionName, points: QdrantPoint[]): Promise<number> {
  if (points.length === 0) return 0
  const qc = getQdrant()
  const BATCH = 64
  for (let i = 0; i < points.length; i += BATCH) {
    // Qdrant 클라이언트는 payload 를 Record<string, unknown> 로 기대 — 경계에서만 캐스트.
    const batch = points.slice(i, i + BATCH).map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload as unknown as Record<string, unknown>,
    }))
    await qc.upsert(name, { wait: true, points: batch })
  }
  return points.length
}

/** 컬렉션 포인트 수(정확). 미존재 시 0. */
export async function countPoints(name: CollectionName): Promise<number> {
  try {
    const res = await getQdrant().count(name, { exact: true })
    return res.count
  } catch {
    return 0
  }
}

/** 벡터 유사도 검색. */
export async function searchCollection(
  name: CollectionName,
  vector: number[],
  limit = 5,
): Promise<SearchHit[]> {
  const res = await getQdrant().search(name, { vector, limit, with_payload: true })
  return res.map((r) => ({
    id: r.id,
    score: r.score,
    payload: (r.payload ?? {}) as unknown as PointPayload,
  }))
}

/** Qdrant 버전(헬스체크용). 실패 시 throw. */
export async function qdrantVersion(): Promise<string> {
  const res = await fetch(`${QDRANT_URL}/`, { signal: AbortSignal.timeout(3000) })
  const json = (await res.json()) as { version?: string }
  return json.version ?? 'unknown'
}

export { QDRANT_URL }
