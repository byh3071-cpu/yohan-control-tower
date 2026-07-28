/**
 * 인제스트 소스 레지스트리 — 12개 노션 DB/페이지의 단일 SoT.
 * UI(버튼 목록)와 인제스트 라우트가 공유한다.
 *
 * notionId 는 비밀이 아니다(식별자). 토큰만 .env.local(gitignore)에 둔다.
 * 필요 시 envVar 로 개별 오버라이드 가능.
 */
import type { SourceDb, CollectionName } from './types'

export interface SourceConfig {
  /** 라우트 경로 slug = /api/vector/ingest/{slug} */
  slug: string
  source: SourceDb
  collection: CollectionName
  tier: 1 | 2 | 3
  /** UI 표시명 */
  label: string
  /** database = dataSources.query, page = loadPage */
  kind: 'database' | 'page'
  /** 기본 notion id(대시 없는 32 hex). envVar 로 오버라이드 가능. */
  notionId: string
  envVar: string
  /** UI 표시용 예상 건수 */
  expected: number
}

export const SOURCES: SourceConfig[] = [
  // ── Tier 1 ──
  { slug: 'ai-dictionary', source: 'ai_dictionary', collection: 'knowledge_base', tier: 1, label: 'AI 사전', kind: 'database', notionId: '3349740ab07280479b76cbe59b50c863', envVar: 'NOTION_AI_DICTIONARY_DB_ID', expected: 269 },
  { slug: 'protocol', source: 'protocol', collection: 'system_rules', tier: 1, label: 'PROTOCOL', kind: 'database', notionId: '7668be4ce9464933a36388aa285b50b3', envVar: 'NOTION_PROTOCOL_DB_ID', expected: 36 },
  { slug: 'rulebook', source: 'rulebook', collection: 'system_rules', tier: 1, label: 'RULEBOOK', kind: 'database', notionId: 'befb40e13612403fbfb474804948101b', envVar: 'NOTION_RULEBOOK_DB_ID', expected: 33 },

  // ── Tier 2 ──
  { slug: 'summary', source: 'summary', collection: 'knowledge_base', tier: 2, label: 'SUMMARY', kind: 'database', notionId: '5b1d339873c54df19e5da1e69602b902', envVar: 'NOTION_SUMMARY_DB_ID', expected: 197 },
  { slug: 'knowledge-hub', source: 'knowledge_hub', collection: 'knowledge_base', tier: 2, label: '지식 허브', kind: 'database', notionId: '69a8df149c0d4e068f9dceb9d52a9975', envVar: 'NOTION_KNOWLEDGE_HUB_DB_ID', expected: 98 },
  { slug: 'person', source: 'person_db', collection: 'knowledge_base', tier: 2, label: '인물 DB', kind: 'database', notionId: '9c753cddbd3446aa9b48e4b6a746fc9d', envVar: 'NOTION_PERSON_DB_ID', expected: 50 },
  { slug: 'keyword', source: 'keyword_db', collection: 'knowledge_base', tier: 2, label: '키워드 DB', kind: 'database', notionId: '68ccd74d11dc4704b54bd169e026246d', envVar: 'NOTION_KEYWORD_DB_ID', expected: 22 },
  { slug: 'constitution', source: 'constitution', collection: 'system_rules', tier: 2, label: '헌법 8조', kind: 'page', notionId: 'f622d191efa7456ea1b4b1c719eb729d', envVar: 'NOTION_CONSTITUTION_PAGE_ID', expected: 8 },
  { slug: 'preference', source: 'preference_db', collection: 'system_rules', tier: 2, label: '취향 DB', kind: 'database', notionId: '2f22671372d24da1b1f7746b6609f621', envVar: 'NOTION_PREFERENCE_DB_ID', expected: 123 },

  // ── Tier 3 ──
  { slug: 'execution-log', source: 'execution_log', collection: 'execution_history', tier: 3, label: 'EXEC LOG', kind: 'database', notionId: 'b495b7091df84a1a96bb98a605ff09ae', envVar: 'NOTION_EXECUTION_LOG_DB_ID', expected: 462 },
  { slug: 'retrospect', source: 'retrospect', collection: 'execution_history', tier: 3, label: 'RETROSPECT', kind: 'database', notionId: '7a4f88d644d04b19b9cfde0c8bcf1c5f', envVar: 'NOTION_RETROSPECT_DB_ID', expected: 31 },
  { slug: 'resource', source: 'resource', collection: 'semantic_cache', tier: 3, label: 'RESOURCE', kind: 'database', notionId: 'ad9393ca0d324f10b27e4902106fa9b8', envVar: 'NOTION_RESOURCE_DB_ID', expected: 196 },
]

export function getSource(slug: string): SourceConfig | undefined {
  return SOURCES.find((s) => s.slug === slug)
}

export function getSourceByDb(source: SourceDb): SourceConfig | undefined {
  return SOURCES.find((s) => s.source === source)
}

export function sourcesByTier(tier: 1 | 2 | 3): SourceConfig[] {
  return SOURCES.filter((s) => s.tier === tier)
}

/** 런타임 env 오버라이드 적용한 notion id(서버 전용). */
export function resolveNotionId(cfg: SourceConfig): string {
  const v = process.env[cfg.envVar]
  return v && v.length > 0 ? v : cfg.notionId
}

export const ALL_COLLECTIONS: CollectionName[] = [
  'knowledge_base',
  'system_rules',
  'semantic_cache',
  'execution_history',
]
