/**
 * Qdrant 클라이언트 래퍼.
 * - 컬렉션 보장(없으면 생성) · upsert(배치) · count · search
 * - 포인트 ID는 (notion_page_id + chunk_index)에서 결정적으로 생성 → 재인제스트 멱등.
 */
import { QdrantClient } from '@qdrant/js-client-rest'
import { createHash } from 'node:crypto'
import { VECTOR_SIZE, DISTANCE, COLLECTION_NAMES } from './collections'
import type { CollectionName, QdrantPoint, SearchHit, PointPayload, SourceDb } from './types'

const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333'

// 데이터 경로(upsert/search/count) 타임아웃(초). QdrantClient 기본값은 300초라
// Qdrant 무응답 시 검색 요청이 사실상 무한 대기 → 명시적으로 짧게 잡아 hang 방지.
// upsert 는 64개 배치라 로컬에선 여유. 필요 시 QDRANT_TIMEOUT_SEC 로 조정.
// ⚠️ 생성자 timeout 은 밀리초 단위(내부 setTimeout(abort, timeout)ms, 기본 300000=300초)라
//    초 값을 *1000 해서 넘겨야 함. 초를 그대로 주면 30ms 전역 타임아웃이 되어 모든 요청 즉시 실패.
const QDRANT_TIMEOUT_SEC = Number(process.env.QDRANT_TIMEOUT_SEC) || 30
const QDRANT_TIMEOUT_MS = QDRANT_TIMEOUT_SEC * 1000

let client: QdrantClient | null = null

export function getQdrant(): QdrantClient {
  if (!client) client = new QdrantClient({ url: QDRANT_URL, timeout: QDRANT_TIMEOUT_MS })
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

/**
 * 배치 upsert 도중 한 배치가 실패했을 때 던지는 에러.
 * Qdrant 배치는 wait:true 로 배치 단위 커밋 → 실패 직전까지 완료된 배치는 이미 영속이다.
 * 그 영속분 개수(`upserted`)를 실어 호출부가 upserted/chunksLost 를 정확히 집계하도록 한다.
 * (이 개수를 무시하고 "그룹 전량 미저장"으로 가정하면 관측 수치가 오보된다.)
 */
export class PartialUpsertError extends Error {
  constructor(
    message: string,
    /** 실패 직전까지 성공적으로 영속된 포인트 수(완료된 배치의 누계). */
    readonly upserted: number,
  ) {
    super(message)
    this.name = 'PartialUpsertError'
  }
}

/**
 * 포인트 배치 upsert(대량 시 64개 단위로 분할). 반환값은 영속에 성공한 포인트 수.
 * 배치 도중 실패하면 PartialUpsertError(완료 배치 누계)를 던진다 — 앞 배치는 이미 저장됨.
 */
export async function upsertPoints(name: CollectionName, points: QdrantPoint[]): Promise<number> {
  if (points.length === 0) return 0
  const qc = getQdrant()
  const BATCH = 64
  let done = 0
  for (let i = 0; i < points.length; i += BATCH) {
    // Qdrant 클라이언트는 payload 를 Record<string, unknown> 로 기대 — 경계에서만 캐스트.
    // 송신 방향: p.payload 는 이미 PointPayload 로 정적 보장(QdrantPoint.payload) → 런타임
    // 가드는 부적절. PointPayload 에 인덱스 시그니처가 없어 widening 에 unknown 경유가 필수
    // (단일 캐스트는 TS2352). 그대로 유지.
    const batch = points.slice(i, i + BATCH).map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload as unknown as Record<string, unknown>,
    }))
    try {
      await qc.upsert(name, { wait: true, points: batch })
    } catch (e) {
      // 완료 배치(done)는 이미 커밋됨 → 부분 저장분을 실어 던진다(호출부가 손실 청크를 정확히 계산).
      const message = e instanceof Error ? e.message : String(e)
      throw new PartialUpsertError(message, done)
    }
    done += batch.length
  }
  return done
}

/**
 * 한 페이지의 잔존(stale) 청크 삭제 — chunk_index >= fromIndex.
 * 재인제스트에서 청크 수가 줄면(5→3) 결정적 ID upsert 만으로는 옛 꼬리(idx 3,4)가
 * 남아 SoT 미러 계약이 깨진다. 새 청크 upsert 후 이 함수로 꼬리를 제거한다.
 */
export async function deleteStaleChunks(
  name: CollectionName,
  notionPageId: string,
  fromIndex: number,
): Promise<void> {
  await getQdrant().delete(name, {
    wait: true,
    filter: {
      must: [
        { key: 'notion_page_id', match: { value: notionPageId } },
        { key: 'chunk_index', range: { gte: fromIndex } },
      ],
    },
  })
}

/**
 * 고아 포인트 삭제 — 같은 source_db 인데 이번 인제스트에서 노션에 존재하지 않은 페이지.
 * 노션에서 레코드가 삭제되면 재인제스트가 그 페이지를 아예 순회하지 않으므로,
 * 소스 단위로 "살아있는 페이지 ID 목록" 밖의 포인트를 걷어내야 미러가 유지된다.
 * keepPageIds 가 비면 no-op — Notion 조회 0건(일시 장애) 시 source_db 전량 삭제 방지.
 * (0건 skip ≠ 부분 fetch 안전: keepPageIds 가 실제보다 짧으면 orphan 대량 삭제 위험은 남음.)
 */
export async function deleteOrphanPoints(
  name: CollectionName,
  sourceDb: SourceDb,
  keepPageIds: string[],
): Promise<void> {
  if (keepPageIds.length === 0) return
  await getQdrant().delete(name, {
    wait: true,
    filter: {
      must: [{ key: 'source_db', match: { value: sourceDb } }],
      must_not: [{ key: 'notion_page_id', match: { any: keepPageIds } }],
    },
  })
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

/** scroll 만 필요한 최소 클라이언트 표면(단위테스트 mock 주입용). */
export type QdrantScroller = Pick<QdrantClient, 'scroll'>

/**
 * 해당 source_db 포인트 중 payload.last_edited_time 최댓값.
 * Vercel serverless 에서 sinceDate SoT — 로컬 상태파일 대신 Qdrant 스크롤 집계.
 * 포인트 0이면 null(호출부가 전체 인제스트로 폴백).
 */
export async function getMaxLastEditedTime(
  collection: CollectionName,
  source: SourceDb,
  client: QdrantScroller = getQdrant(),
): Promise<string | null> {
  let offset: string | number | Record<string, unknown> | null | undefined = undefined
  let max: string | null = null
  do {
    const res = await client.scroll(collection, {
      filter: { must: [{ key: 'source_db', match: { value: source } }] },
      with_payload: ['last_edited_time'],
      with_vector: false,
      limit: 100,
      ...(offset !== undefined && offset !== null ? { offset } : {}),
    })
    for (const point of res.points) {
      const raw = point.payload?.last_edited_time
      if (typeof raw !== 'string' || raw.length === 0) continue
      if (max === null || raw > max) max = raw
    }
    offset = res.next_page_offset ?? null
  } while (offset !== null && offset !== undefined)
  return max
}

/**
 * Qdrant 가 돌려준 payload(외부 경계, 정적 타입 미상)가 PointPayload 인지 런타임 검증.
 * 우리가 upsert 하는 코어 필드(문자열)만 확인 — 합치면 안전하게 narrow.
 * (선택 필드까지 강제하면 정상 payload 를 떨굴 위험이 있어 코어만 검사.)
 */
function isPointPayload(v: unknown): v is PointPayload {
  if (v === null || typeof v !== 'object') return false
  const p = v as Record<string, unknown>
  return (
    typeof p.source_db === 'string' &&
    typeof p.notion_page_id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.text === 'string'
  )
}

/** 벡터 유사도 검색. */
export async function searchCollection(
  name: CollectionName,
  vector: number[],
  limit = 5,
): Promise<SearchHit[]> {
  // js-client 1.18부터 기존 search 메서드가 통합 query API로 대체됐다.
  const res = await getQdrant().query(name, { query: vector, limit, with_payload: true })
  return res.points.map((r) => ({
    id: r.id,
    score: r.score,
    // 정상 payload 면 가드로 narrow, 비정상/누락이면 기존과 동일하게 빈 객체 폴백.
    payload: isPointPayload(r.payload) ? r.payload : ({} as PointPayload),
  }))
}

/** Qdrant 버전(헬스체크용). 실패 시 throw. */
export async function qdrantVersion(): Promise<string> {
  const res = await fetch(`${QDRANT_URL}/`, { signal: AbortSignal.timeout(3000) })
  const json = (await res.json()) as { version?: string }
  return json.version ?? 'unknown'
}

export { QDRANT_URL }
