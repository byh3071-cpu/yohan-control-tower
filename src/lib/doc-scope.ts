import type { DocCategory, DocMeta } from "./types"

/**
 * 문서 범위(scope) — 관리 대상 vs 수집물.
 *
 * 브레인은 두 성격이 섞여 있다. status·칸반 같은 "관리" 개념은 관리 대상에만 의미가 있고,
 * 수집물(피드·사전·교재)에 적용하면 신호가 노이즈에 파묻힌다.
 * 2026-07-21 실측: 관리 113 / 수집 443 (총 556).
 *
 * 분류 근거는 `DOC_SOURCES`(memory.ts)의 `DocCategory` 9종.
 * (scripts/docs-lint.ts 의 RECORD_DIRS 는 재사용 불가 — dashboard tsconfig 범위 밖이고,
 *  그 규칙은 docs/ 내부 전용이라 대상 범위 자체가 다르다.)
 */
export type DocScope = "managed" | "collected"

/**
 * 문서 필터 축 — 사이드바 하나로 통일된 단일 축.
 * `all`(전체) · 성격(`managed`/`collected`) · 개별 분류(DocCategory).
 * 표에 있던 범위 스위치·분류 칩은 이 축으로 흡수됐다(2026-07-22, 뷰 통합).
 */
export type DocFilter = DocCategory | DocScope | "all"

/** 사이드바 그룹 순서 — 문서 수가 많은 순(실측 2026-07-22) */
export const SCOPE_GROUPS: { id: DocScope; categories: DocCategory[] }[] = [
  { id: "managed", categories: ["decisions", "rules", "projects", "templates"] },
  { id: "collected", categories: ["rss", "curriculum", "insights", "wiki", "url"] },
]

export function matchesFilter(doc: Pick<DocMeta, "category">, f: DocFilter): boolean {
  if (f === "all") return true
  if (f === "managed" || f === "collected") return docScope(doc.category) === f
  return doc.category === f
}

const MANAGED: ReadonlySet<DocCategory> = new Set<DocCategory>([
  "decisions", // 결정 로그 — status 50%
  "rules", // 규칙 — status 100%
  "projects", // 프로젝트 — status 100%
  "templates", // 템플릿
])

/** 수집물: rss · insights · url · wiki · curriculum (status 거의 없음, wiki 는 0%) */
export function docScope(category: DocCategory): DocScope {
  return MANAGED.has(category) ? "managed" : "collected"
}

export function isManaged(doc: Pick<DocMeta, "category">): boolean {
  return docScope(doc.category) === "managed"
}

export const SCOPE_LABEL: Record<DocScope | "all", string> = {
  managed: "관리 대상",
  collected: "수집물",
  all: "전체",
}

/** status 가 비어 있는 관리 대상 = "구멍". 채워져야 칸반(T2)이 성립한다. */
export function isGap(doc: Pick<DocMeta, "category" | "status">): boolean {
  return isManaged(doc) && !doc.status
}

export interface ScopeCounts {
  managed: number
  collected: number
  all: number
  gaps: number
}

export function countByScope(docs: readonly DocMeta[]): ScopeCounts {
  let managed = 0
  let gaps = 0
  for (const d of docs) {
    if (!isManaged(d)) continue
    managed++
    if (!d.status) gaps++
  }
  return { managed, collected: docs.length - managed, all: docs.length, gaps }
}
