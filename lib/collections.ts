/**
 * Qdrant 컬렉션 4종 정의 (P0 단일 SoT 스펙 기준).
 * 모두 768차원(nomic-embed-text) · Cosine 거리.
 */
import type { CollectionName, SourceDb } from './types'

/** nomic-embed-text 기본 출력 차원. */
export const VECTOR_SIZE = 768

/** 거리 측정. Qdrant enum 문자열. */
export const DISTANCE = 'Cosine' as const

export interface CollectionDef {
  name: CollectionName
  /** "이 컬렉션은 어떤 질문에 답하는가". */
  purpose: string
  /** 이 컬렉션으로 인제스트되는 소스 DB들. */
  sources: SourceDb[]
}

export const COLLECTIONS: readonly CollectionDef[] = [
  {
    name: 'knowledge_base',
    purpose: '이 주제에 대해 내가 아는 게 뭐야?',
    sources: ['ai_dictionary', 'summary', 'knowledge_hub', 'person_db', 'keyword_db'],
  },
  {
    name: 'system_rules',
    purpose: '이 작업에서 지켜야 할 규칙은?',
    sources: ['protocol', 'rulebook', 'preference_db', 'constitution'],
  },
  {
    name: 'semantic_cache',
    purpose: '이전에 비슷한 자료 수집한 적 있나?',
    sources: ['resource'],
  },
  {
    name: 'execution_history',
    purpose: '전에 비슷한 작업 어떻게 했지?',
    sources: ['execution_log', 'retrospect'],
  },
] as const

/** 컬렉션 이름 배열(상태 조회·일괄 생성용). */
export const COLLECTION_NAMES: CollectionName[] = COLLECTIONS.map((c) => c.name)

/** source_db → 소속 컬렉션 역매핑. */
export function collectionForSource(source: SourceDb): CollectionName {
  const def = COLLECTIONS.find((c) => c.sources.includes(source))
  if (!def) throw new Error(`알 수 없는 source_db: ${source}`)
  return def.name
}
