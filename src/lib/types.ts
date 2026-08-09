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

/** 할일이 어디에 매달려 있는가 — 정렬·그룹의 1차 축.
 *  goal 이면 status·priority 로 "진행 중 / 대기"를 가른다. doc 이면 그냥 문서 액션. */
export interface TodoOrigin {
  kind: "goal" | "doc"
  /** goal 일 때만 */
  goalId?: number
  goalTitle?: string
  /** allowlist 통과값 또는 "unknown" (미지 status 를 조용히 버리지 않는다) */
  goalStatus?: string
  /** allowlist 통과값 또는 부재 시 "P2" */
  priority?: "P0" | "P1" | "P2"
  /** 출처 문서를 `/api/docs` 뷰어로 열 수 있을 때의 코퍼스 상대경로.
   *  코퍼스 밖(goals/·docs/) 이면 undefined → UI 는 클릭 불가 라벨로 표시(죽은 버튼 방지) */
  openPath?: string
}

/** 레포 전역 `- [ ]` 중 경로·헤딩 필터를 통과한 1회성 할일 */
export interface TodoItem {
  /**
   * `relPath#<텍스트 해시 8자>` — 줄번호를 쓰면 문서 위에 한 줄만 추가돼도 그 아래
   * 모든 할일의 id 가 밀린다. 나중에 항목별 상태(분류·숨김)를 캐시에 붙일 때
   * 엉뚱한 항목에 달라붙는 사고가 나므로 내용 기준으로 잡는다.
   */
  id: string
  text: string
  relPath: string
  line: number
  /** 이 할일이 속한 의도 헤딩 (예: "다음 액션") */
  heading: string
  /** 출처 종류·귀속. 그룹·정렬의 1차 축 */
  origin: TodoOrigin
}

export interface TodosResponse {
  ok: boolean
  todos: TodoItem[]
  total: number
  /** 스캔 디렉토리별 수집 개수 */
  bySource: Record<string, number>
  scanned: string[]
  /** 존재하지 않는 스캔 경로 — 오타가 "0건"으로 위장하지 않게 표면화한다 */
  missingDirs: string[]
  generatedAt: string
}

export type MissionUnit = "task" | "calendar"

export interface MissionProjectSummary {
  /** projects.yaml에 이 미션으로 배속된 전체 프로젝트 */
  configured: number
  /** YOHAN_REPOS_ROOT 아래 실제 로컬 클론 */
  local: number
  /** 로컬 클론 중 goals/ 계약을 가진 프로젝트 */
  withGoals: number
  /** 아직 로컬에 없어 Task 수를 알 수 없는 프로젝트 */
  unknown: number
}

export interface MissionTaskSummary {
  total: number
  active: number
  queued: number
  blocked: number
  done: number
  other: number
  /** 확장 status를 손실하지 않는 원시 집계 */
  byStatus: Record<string, number>
}

export interface MissionRollup {
  id: string
  label: string
  unit: MissionUnit
  projects: MissionProjectSummary
  tasks: MissionTaskSummary
}

export interface MissionCoverage {
  configuredProjects: number
  assignedProjects: number
  unassignedProjects: number
  localAssignedProjects: number
  unknownAssignedProjects: number
}

export interface MissionsResponse {
  ok: boolean
  setupRequired: boolean
  missions: MissionRollup[]
  coverage: MissionCoverage
  sourceVersion: string | null
  generatedAt: string
  error?: string
}

export interface GoalTask {
  file: string
  type: string | null
  id: number | null
  title: string
  /** fallback 파일명이 아닌 frontmatter title이 실제로 있었는지 */
  titleDeclared: boolean
  status: string | null
  priority: string | null
  completed: string | null
  checks: { total: number; done: number }
}

export interface ProjectSummary {
  name: string
  mission: string
  status: string | null
  role: string | null
  local: boolean
  goalsAvailable: boolean
  tasks: MissionTaskSummary
}

export interface ProjectMissionGroup {
  id: string
  label: string
  unit: MissionUnit
  projects: ProjectSummary[]
}

export interface ProjectsResponse {
  ok: boolean
  setupRequired: boolean
  missions: ProjectMissionGroup[]
  unassignedProjects: number
  sourceVersion: string | null
  generatedAt: string
  error?: string
}

export interface ProjectDetailResponse {
  ok: boolean
  setupRequired: boolean
  project: ProjectSummary | null
  goals: GoalTask[]
  available: boolean
  generatedAt: string
  error?: string
}

export type LintSeverity = "error" | "warning" | "info"
export type LintIssueKind =
  | "project_unassigned"
  | "repo_unregistered"
  | "goal_frontmatter"
  | "goal_status_extension"

export interface LintIssue {
  id: string
  kind: LintIssueKind
  severity: LintSeverity
  project: string | null
  file: string | null
  message: string
  suggestion: string
}

export interface LintCounts {
  total: number
  actionable: number
  error: number
  warning: number
  info: number
}

export interface LintResponse {
  ok: boolean
  setupRequired: boolean
  counts: LintCounts
  issues: LintIssue[]
  excludedLocalDirs: string[]
  generatedAt: string
  error?: string
}

export type CalendarItemKind = "event" | "task"
export type CalendarItemStatus = "open" | "done" | "canceled"
export type CalendarRecurrence = "none" | "daily" | "weekly" | "monthly"

export interface CalendarItem {
  id: string
  kind: CalendarItemKind
  title: string
  date: string
  startTime: string | null
  endTime: string | null
  status: CalendarItemStatus
  recurrence: CalendarRecurrence
  recurrenceInterval: number
  recurrenceUntil: string | null
  completedDates: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CalendarOccurrence {
  id: string
  sourceId: string
  sourceDate: string
  sourceUpdatedAt: string
  kind: CalendarItemKind
  title: string
  date: string
  startTime: string | null
  endTime: string | null
  status: CalendarItemStatus
  recurring: boolean
  recurrence: CalendarRecurrence
  recurrenceInterval: number
  recurrenceUntil: string | null
  notes: string
}

export interface CalendarFileIssue {
  file: string
  message: string
}

export interface CalendarResponse {
  ok: boolean
  setupRequired: boolean
  from: string
  to: string
  occurrences: CalendarOccurrence[]
  sourceItems: number
  issues: CalendarFileIssue[]
  generatedAt: string
  error?: string
}

export interface CalendarCreateInput {
  kind: CalendarItemKind
  title: string
  date: string
  startTime?: string | null
  endTime?: string | null
  recurrence?: CalendarRecurrence
  recurrenceInterval?: number
  recurrenceUntil?: string | null
  notes?: string
}

export interface CalendarUpdateInput extends Omit<CalendarCreateInput, "kind"> {
  expectedUpdatedAt: string
}

export interface CalendarTrashItem {
  trashId: string
  id: string
  kind: CalendarItemKind
  title: string
  date: string
  updatedAt: string
  deletedAt: string
}

export interface CalendarTrashResponse {
  ok: boolean
  setupRequired: boolean
  items: CalendarTrashItem[]
  issues: CalendarFileIssue[]
  generatedAt: string
  error?: string
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

export type InboxItemStatus =
  | "queued"
  | "processing"
  | "review_required"
  | "completed"
  | "action_required"
  | "failed"

export type InboxStage = "captured" | "triaged" | "deep_analyzed" | "decided" | "promoted"

export type InboxDisposition =
  | "knowledge"
  | "skill"
  | "action"
  | "reference"
  | "duplicate"
  | "reject"
  | "unrecoverable"

export interface InboxActionCandidate {
  id: string
  title: string
  detail?: string
}

export interface InboxCaptureEnvelope {
  version: "CaptureEnvelope.v1"
  raw_text?: string
  canonical_url?: string
  user_note?: string
  captured_at: string
  attachments: Array<{
    id?: string
    filename?: string
    content_type?: string
    sha256: string
  }>
}

export interface InboxItem {
  id: string
  status: InboxItemStatus
  stage: InboxStage
  disposition: InboxDisposition | null
  platform: string
  capture_channel: string
  content_kind: string
  canonical_url: string | null
  envelope: InboxCaptureEnvelope
  triage: null | {
    source_summary: string
    relevance: number
    recommended_disposition: InboxDisposition
    requires_deep: boolean
    duplicate_of?: string
    missing_context: string[]
  }
  deep: null | {
    title: string
    summary: string
    key_points: string[]
    evidence: string[]
    yohan_relevance: string
    recommended_disposition: InboxDisposition
    actions: InboxActionCandidate[]
    uncertainties: string[]
  }
  human: null | {
    decision: "approve" | "reject" | "defer"
    disposition?: InboxDisposition
    my_thoughts?: string
    selected_actions: string[]
  }
  promotion: Record<string, unknown> | null
  attempt_count: number
  created_at: string
  updated_at: string
}

export interface InboxCounts {
  queued: number
  processing: number
  review_required: number
  completed: number
  action_required: number
  failed: number
  total: number
}

export interface InboxStageCounts {
  captured: number
  triaged: number
  deep_analyzed: number
  decided: number
  promoted: number
  total: number
}

export interface InboxDashboardResponse {
  ok: boolean
  status: InboxCounts
  stage: InboxStageCounts
  active: { total: number; by_status: InboxCounts }
  items: InboxItem[]
  generatedAt: string
  error?: string
}

export type KnowledgeReviewDecision = "approve" | "approve_after_edit" | "hold" | "reject"

export type KnowledgeReviewStatus = "review_required" | "completed" | "held" | "rejected"

export interface KnowledgeReviewClaim {
  claim: string
  timestamp?: string
}

/** Focus Feed가 사람 검토를 요청한 표시 전용 항목 계약입니다. */
export interface KnowledgeReviewItem {
  id: string
  status: KnowledgeReviewStatus
  title: string
  originalUrl: string
  notebookLmSource?: string
  summary: string
  claims: KnowledgeReviewClaim[]
  category: string
  qualityWarnings: string[]
  updatedAt?: string
}

export interface KnowledgeReviewListResponse {
  ok: boolean
  items: KnowledgeReviewItem[]
  source: "yohan-mcp"
}
