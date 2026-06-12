export type Domain =
  | "개발"
  | "운영/자동화"
  | "지식관리"
  | "창업/비즈니스"
  | "AI/ML"
  | "생산성"
  | "기타"

/** 히트맵 스택·범례 순서 (§10.3) */
export const DOMAIN_AXIS_ORDER: readonly Domain[] = [
  "개발",
  "운영/자동화",
  "지식관리",
  "창업/비즈니스",
  "AI/ML",
  "생산성",
  "기타",
] as const

const TAG_TO_DOMAIN: Record<string, Domain> = {
  github: "개발",
  cursor: "개발",
  "vibe-coding": "개발",
  pipeline: "개발",
  router: "개발",
  mcp: "개발",
  ui: "개발",
  dashboard: "개발",

  automation: "운영/자동화",
  harness: "운영/자동화",
  operations: "운영/자동화",
  checklist: "운영/자동화",
  runbook: "운영/자동화",
  troubleshooting: "운영/자동화",
  daily: "운영/자동화",

  SoT: "지식관리",
  wiki: "지식관리",
  curriculum: "지식관리",
  obsidian: "지식관리",
  notion: "지식관리",
  rss: "지식관리",
  ocr: "지식관리",
  "OCR-telegram": "지식관리",
  telegram: "지식관리",
  guide: "지식관리",
  "context-engineering": "지식관리",

  plan: "창업/비즈니스",
  planning: "창업/비즈니스",
  decisions: "창업/비즈니스",
  income: "창업/비즈니스",
  capital: "창업/비즈니스",
  product: "창업/비즈니스",
  leverage: "창업/비즈니스",

  summary: "AI/ML",
  pge: "AI/ML",

  systems: "생산성",
  PARA: "생산성",
  orchestration: "생산성",
}

export function tagToDomain(tag: string): Domain {
  return TAG_TO_DOMAIN[tag] ?? "기타"
}

export function buildDomainCounts(tags: string[]): Record<Domain, number> {
  const counts: Record<Domain, number> = {
    "개발": 0,
    "운영/자동화": 0,
    "지식관리": 0,
    "창업/비즈니스": 0,
    "AI/ML": 0,
    "생산성": 0,
    "기타": 0,
  }
  for (const t of tags) {
    counts[tagToDomain(t)]++
  }
  return counts
}

export const DOMAIN_COLORS: Record<Domain, string> = {
  "개발": "#818cf8",
  "운영/자동화": "#a78bfa",
  "지식관리": "#34d399",
  "창업/비즈니스": "#fbbf24",
  "AI/ML": "#f472b6",
  "생산성": "#38bdf8",
  "기타": "#94a3b8",
}
