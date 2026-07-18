/**
 * 요한 관제탑 — 공용 타입 정의
 *
 * 노션(SoT) → 청킹 → Ollama 임베딩 → Qdrant 저장 파이프라인 전반에서 쓰는 타입.
 * `any` 금지(SOUL 코딩 선호). 모든 벡터 포인트는 source_system 메타데이터를 가진다.
 */

/** 벡터 포인트의 원천 시스템. P0는 전부 'notion'. P4 이후 memory/ 이전 시 'memory'. */
export type SourceSystem = 'notion' | 'memory'

/** Qdrant 컬렉션 4종. */
export type CollectionName =
  | 'knowledge_base'
  | 'system_rules'
  | 'semantic_cache'
  | 'execution_history'

/** 인제스트 소스 DB 식별자(메타데이터 source_db). */
export type SourceDb =
  | 'ai_dictionary'
  | 'summary'
  | 'knowledge_hub'
  | 'person_db'
  | 'keyword_db'
  | 'protocol'
  | 'rulebook'
  | 'preference_db'
  | 'constitution'
  | 'resource'
  | 'execution_log'
  | 'retrospect'

/** system_rules 우선순위(헌법=highest, 절대규칙=high, 그 외=standard). */
export type RulePriority = 'highest' | 'high' | 'standard'

/** system_rules 규칙 종류. */
export type RuleType = 'protocol' | 'rule' | 'preference' | 'constitution'

/**
 * 노션에서 정규화한 레코드 1건(DB 행 또는 페이지).
 * props 는 프로퍼티명 → 표시용 평문 문자열로 평탄화한 것.
 * body 는 페이지 본문 블록을 평문/마크다운으로 직렬화한 것.
 */
export interface NotionRecord {
  id: string
  url: string
  title: string
  createdTime: string
  lastEditedTime: string
  props: Record<string, string>
  body: string
}

/** 청킹 결과 1조각. section 은 인물 DB 6섹션 등 구조적 분할 시 라벨. */
export interface Chunk {
  text: string
  index: number
  section?: string
}

/**
 * Qdrant 포인트 페이로드(메타데이터 + 검색 표시용 본문 text).
 * 스펙의 컬렉션별 메타데이터를 합집합으로 모델링하고, 선택 필드로 구분한다.
 */
export interface PointPayload {
  source_system: SourceSystem
  source_db: SourceDb
  notion_page_id: string
  notion_page_url: string
  title: string
  /** 검색 결과에 보여줄 청크 본문. */
  text: string
  chunk_index: number
  total_chunks: number
  created_time: string
  last_edited_time: string
  /** 카테고리(있을 경우). knowledge_base / semantic_cache / execution_history. */
  category?: string
  /** 구조적 섹션 라벨(인물 DB 6섹션, 헌법 조 등). */
  section?: string
  /** system_rules 전용. */
  priority?: RulePriority
  rule_type?: RuleType
  /** semantic_cache(resource) 전용. */
  resource_type?: string
}

/** Qdrant upsert 단위. id 는 page_id+chunk_index 로부터 결정적으로 생성(멱등). */
export interface QdrantPoint {
  id: string
  vector: number[]
  payload: PointPayload
}

/** 검색 결과 1건. */
export interface SearchHit {
  id: string | number
  score: number
  payload: PointPayload
}

/** 인제스트 중 개별 페이지 실패 기록(전체 중단 없이 계속). */
export interface IngestError {
  page: string
  message: string
  /** 이 레코드에서 손실된 청크 수(임베딩+upsert 실패로 저장 안 됨). */
  chunksLost: number
}

/**
 * 인제스트 1회 실행 결과 요약(API 응답 본문).
 *
 * 단위 경계(혼용 금지):
 * - pages: 노션 레코드 수(레코드 단위)
 * - chunks: 생성된 총 청크 수(청크 단위) = upserted + chunksFailed
 * - upserted: Qdrant 저장 성공 청크 수(청크 단위)
 * - recordsFailed: 임베딩/저장이 실패한 레코드 수(레코드 단위)
 * - chunksFailed: 저장 못 한 청크 수(청크 단위) = chunks - upserted
 */
export interface IngestSummary {
  source_db: SourceDb
  collection: CollectionName
  pages: number
  chunks: number
  upserted: number
  recordsFailed: number
  chunksFailed: number
  errors: IngestError[]
  durationMs: number
  logs: string[]
}

/** /api/status 응답: Qdrant 연결 + 컬렉션별 건수 + 소스별 최신 last_edited_time. */
export interface StatusResponse {
  qdrant: {
    connected: boolean
    version?: string
    error?: string
  }
  ollama: {
    available: boolean
    model: string
    error?: string
  }
  notion: {
    configured: boolean
  }
  collections: Record<CollectionName, number>
  /** 소스별 Qdrant max(payload.last_edited_time). 미인제스트면 null. */
  sources: Record<SourceDb, string | null>
}

/** /api/query 응답. */
export interface QueryResponse {
  collection: CollectionName
  query: string
  hits: SearchHit[]
}
