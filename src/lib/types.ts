export type DocCategory =
  | "insights"
  | "rss"
  | "url"
  | "wiki"
  | "curriculum"
  | "projects"
  | "decisions"
  | "rules"
  | "templates"

export interface DocMeta {
  id: string
  title: string
  date: string | null
  tags: string[]
  /** Frontmatter `related` ids (kebab or note id) */
  related: string[]
  category: DocCategory
  /** Frontmatter `status` 원시값 — 정규화는 뷰 레이어에서 (값 손실 방지) */
  status: string | null
  relPath: string
  excerpt: string
  sourceName: string | null
}

/** 레포 전역 `- [ ]` 중 경로·헤딩 필터를 통과한 1회성 할일 */
export interface TodoItem {
  /** `relPath#line` */
  id: string
  text: string
  relPath: string
  line: number
  /** 이 할일이 속한 의도 헤딩 (예: "다음 액션") */
  heading: string
}

export interface TodosResponse {
  ok: boolean
  todos: TodoItem[]
  total: number
  /** 스캔 디렉토리별 수집 개수 */
  bySource: Record<string, number>
  scanned: string[]
  generatedAt: string
}

export interface DocFull extends DocMeta {
  content: string
  frontmatter: Record<string, unknown>
}

export interface SourceSlice {
  source: string
  count: number
  color: string
}

export interface CategorySlice {
  category: string
  label: string
  count: number
  color: string
}

export interface SessionLog {
  id: string
  date: string
  summary: string[]
  filesChanged: number
}

export interface Stats {
  totalDocs: number
  decisions: number
  ingests: number
  batchStatus: "ok" | "error" | "unknown"
  batchLastRun: string | null
}

export interface IngestTrend {
  date: string
  count: number
}

export interface DomainSlice {
  domain: string
  count: number
  color: string
}

export interface BatchDay {
  date: string
  ok: number
  fail: number
}

export interface ActivityPoint {
  date: string
  commits: number
  ingests: number
  decisions: number
}

export interface DecisionPoint {
  date: string
  count: number
}

export interface HeatmapDay {
  date: string
  count: number
  /** 문서당 첫 태그 → 도메인 1회 (§10.3 레이어) */
  byDomain?: Partial<Record<string, number>>
}

export interface EvaluatorRollup {
  pass: number
  revise: number
  reject: number
  /** 최신순 */
  recent: { id: string; date: string; verdict: string }[]
}

export interface ChartData {
  ingestTrend: IngestTrend[]
  domainDist: DomainSlice[]
  categoryDist: CategorySlice[]
  sourceDist: SourceSlice[]
  batchHistory: BatchDay[]
  activity: ActivityPoint[]
  decisionHistory: DecisionPoint[]
  heatmap: HeatmapDay[]
  evaluatorRollup: EvaluatorRollup | null
}

export interface SerendipityDoc {
  title: string
  excerpt: string
  relPath: string
  category: DocCategory
  date: string | null
  tags: string[]
}

export interface GitCommit {
  hash: string
  date: string
  message: string
}

export interface DecisionEntry {
  title: string
  date: string
  relPath: string
  summary: string
}
