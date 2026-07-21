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
