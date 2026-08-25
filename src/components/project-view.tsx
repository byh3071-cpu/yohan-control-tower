"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FolderGit2,
  FolderKanban,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react"

import { useResponsiveDialog } from "@/components/use-responsive-dialog"
import { buildProjectWorkModel, resolveProjectSelection } from "@/lib/project-work-model"
import { cn } from "@/lib/utils"
import type { WorkSourceResult } from "@/lib/work-items"
import type {
  GoalTask,
  LintIssue,
  LintResponse,
  ProjectDetailResponse,
  ProjectMissionGroup,
  ProjectsResponse,
  ProjectSummary,
} from "@/lib/types"

interface ProjectViewProps {
  initialMissionId?: string | null
  selectedProjectName?: string | null
  onSelectionChange?: (missionId: string | null, projectName: string | null, replace?: boolean) => void
}

function taskSummary(project: ProjectSummary): string {
  if (!project.local) return "이 노트북에 없음"
  if (!project.goalsAvailable) return "goals/ 없음"
  if (project.tasks.total === 0) return "등록된 Goal 없음"
  const parts: string[] = []
  if (project.tasks.active) parts.push(`진행 ${project.tasks.active}`)
  if (project.tasks.blocked) parts.push(`차단 ${project.tasks.blocked}`)
  if (project.tasks.queued) parts.push(`대기 ${project.tasks.queued}`)
  if (project.tasks.done) parts.push(`완료 ${project.tasks.done}`)
  if (project.tasks.other) parts.push(`기타 ${project.tasks.other}`)
  return parts.join(" · ")
}

function statusTone(status: string | null): string {
  if (["DONE"].includes(status ?? "")) return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
  if (["IN_PROGRESS", "ACTIVE", "PR_OPEN", "OBSERVING"].includes(status ?? "")) return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
  if (status === "BLOCKED") return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
  return "border-border bg-muted/50 text-muted-foreground"
}

function pickMission(data: ProjectsResponse | null, missionId: string | null): ProjectMissionGroup | null {
  if (!data) return null
  return data.missions.find((mission) => mission.id === missionId) ?? data.missions[0] ?? null
}

export function ProjectView({
  initialMissionId = null,
  selectedProjectName = null,
  onSelectionChange,
}: ProjectViewProps) {
  const [projectsResult, setProjectsResult] = useState<WorkSourceResult<ProjectsResponse>>({ status: "loading" })
  const [lintResult, setLintResult] = useState<WorkSourceResult<LintResponse>>({ status: "loading" })
  const [detailState, setDetailState] = useState<{ slug: string; data: ProjectDetailResponse | null; error: string | null }>({
    slug: "",
    data: null,
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)
  const projectRefs = useRef(new Map<string, HTMLButtonElement>())
  const selectedProjectRef = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    const timer = setTimeout(() => {
      setProjectsResult({ status: "loading" })
      setLintResult({ status: "loading" })
      void fetch("/api/projects", { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json() as ProjectsResponse
          if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
          return payload
        })
        .then((projects) => { if (alive) setProjectsResult({ status: "ready", data: projects }) })
        .catch((cause: unknown) => { if (alive) setProjectsResult({ status: "error", error: cause instanceof Error ? cause.message : String(cause) }) })
      void fetch("/api/lint", { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json() as LintResponse
          if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
          return payload
        })
        .then((lint) => { if (alive) setLintResult({ status: "ready", data: lint }) })
        .catch((cause: unknown) => { if (alive) setLintResult({ status: "error", error: cause instanceof Error ? cause.message : String(cause) }) })
    }, 0)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [reloadKey])

  const model = useMemo(() => buildProjectWorkModel(projectsResult, lintResult), [lintResult, projectsResult])
  const data = model.projects
  const lint = model.lint
  const selection = data ? resolveProjectSelection(data, initialMissionId, selectedProjectName) : null
  const mission = pickMission(data, selection?.missionId ?? null)
  const project = mission?.projects.find((item) => item.name === selection?.projectName) ?? null

  useEffect(() => {
    if (projectsResult.status !== "ready" || !selection?.stale || !onSelectionChange) return
    const timer = setTimeout(() => onSelectionChange(selection.missionId, null, true), 0)
    return () => clearTimeout(timer)
  }, [onSelectionChange, projectsResult.status, selection])

  useEffect(() => {
    if (!project) return
    let alive = true
    const slug = project.name
    fetch(`/api/projects/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as ProjectDetailResponse
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
        return payload
      })
      .then((payload) => {
        if (alive) setDetailState({ slug, data: payload, error: null })
      })
      .catch((cause: unknown) => {
        if (alive) setDetailState({ slug, data: null, error: cause instanceof Error ? cause.message : String(cause) })
      })
    return () => {
      alive = false
    }
  }, [project, reloadKey])

  const projectIssues = lint?.issues.filter((item) => item.project === project?.name) ?? []

  const chooseMission = (id: string) => {
    onSelectionChange?.(id, null)
  }

  const reload = () => setReloadKey((value) => value + 1)

  const closeDetail = useCallback(() => {
    const previous = selectedProjectRef.current
    onSelectionChange?.(mission?.id ?? null, null)
    requestAnimationFrame(() => {
      if (previous) projectRefs.current.get(previous)?.focus()
    })
  }, [mission?.id, onSelectionChange])

  useEffect(() => {
    if (project) selectedProjectRef.current = project.name
  }, [project])

  const handleProjectKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Enter") {
      event.preventDefault()
      const selected = mission?.projects[index]
      if (selected) {
        selectedProjectRef.current = selected.name
        onSelectionChange?.(mission?.id ?? null, selected.name)
      }
      return
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
    event.preventDefault()
    const projects = mission?.projects ?? []
    const next = Math.max(0, Math.min(projects.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))
    projectRefs.current.get(projects[next]?.name ?? "")?.focus()
  }

  if (model.state === "loading") {
    return (
      <div className="flex min-h-[55vh] items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 size={15} className="animate-spin" aria-hidden /> 프로젝트 지도를 읽는 중
      </div>
    )
  }

  if (model.state === "error") {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-amber-300/70 bg-amber-50/60 p-6 text-center dark:bg-amber-950/20">
        <CircleAlert size={20} className="mx-auto text-amber-600" aria-hidden />
        <h2 className="mt-3 text-base font-semibold">프로젝트 지도를 불러오지 못했습니다.</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">원장을 확인한 뒤 다시 시도해 주세요.</p>
        <button type="button" onClick={reload} className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold">
          <RefreshCw size={12} aria-hidden /> 다시 읽기
        </button>
      </div>
    )
  }

  if (data?.setupRequired) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-border bg-card p-7 text-center">
        <FolderKanban size={22} className="mx-auto text-muted-foreground" aria-hidden />
        <h2 className="mt-3 text-base font-semibold">미션 taxonomy 설정이 필요합니다.</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <code>YOHAN_OS_ROOT</code>가 가리키는 Brain에 <code>memory/core/projects.yaml</code>을 동기화한 뒤 다시 읽으세요.
        </p>
        <button type="button" onClick={reload} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background">
          <RefreshCw size={12} aria-hidden /> 설정 확인
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-full max-w-7xl px-4 py-5 pb-16 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[#ff5c28]" aria-hidden /> Mission / Project / Task
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">프로젝트 지도</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Brain 배속을 기준으로 로컬 레포와 Goal을 읽기 전용으로 펼칩니다.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {lint && (
            <span className={cn(
              "rounded-full border px-2.5 py-1.5 text-[10px] font-semibold tabular-nums",
              lint.counts.actionable > 0 ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300" : "border-emerald-300 bg-emerald-50 text-emerald-700"
            )}>
              정합성 {lint.counts.actionable > 0 ? `${lint.counts.actionable}건 확인` : "정상"}
            </span>
          )}
          <button type="button" onClick={reload} aria-label="프로젝트 새로고침" title="프로젝트 새로고침" className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <RefreshCw size={13} aria-hidden />
          </button>
        </div>
      </header>

      {model.state === "partial" && (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span><strong>프로젝트 목록은 유지됩니다.</strong> {model.errors.join(" · ")}</span>
        </div>
      )}

      <nav aria-label="미션 선택" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {data?.missions.map((item) => {
          const active = item.id === mission?.id
          const local = item.projects.filter((projectItem) => projectItem.local).length
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => chooseMission(item.id)}
              className={cn(
                "min-w-max rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-[#146c94] bg-[#e7eff5] text-[#172326]" : "border-border bg-card hover:bg-muted/60"
              )}
            >
              <span className="block text-[11px] font-semibold">{item.label}</span>
              <span className={cn("mt-0.5 block text-[9px] tabular-nums", active ? "text-[#526367]" : "text-muted-foreground")}>
                로컬 {local}/{item.projects.length}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.8fr)]">
        <section aria-labelledby="project-list-heading" className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <h2 id="project-list-heading" className="text-sm font-semibold">{mission?.label ?? "미션"}</h2>
              <span className="text-[10px] tabular-nums text-muted-foreground">{mission?.projects.length ?? 0} projects</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">로컬 프로젝트를 먼저 표시합니다.</p>
          </div>
          <div className="divide-y divide-border" role="listbox" aria-label="프로젝트 목록">
            {mission?.projects.map((item, index) => {
              const active = item.name === project?.name
              return (
                <button
                  key={item.name}
                  type="button"
                  ref={(node) => {
                    if (node) projectRefs.current.set(item.name, node)
                    else projectRefs.current.delete(item.name)
                  }}
                  role="option"
                  onClick={() => {
                    selectedProjectRef.current = item.name
                    onSelectionChange?.(mission?.id ?? null, item.name)
                  }}
                  onKeyDown={(event) => handleProjectKeyDown(event, index)}
                  aria-selected={active}
                  className={cn(
                    "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    active ? "bg-[#e7eff5]" : "hover:bg-muted/50"
                  )}
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", item.local ? "border-foreground/15 bg-background" : "border-dashed border-border text-muted-foreground")}>
                    <FolderGit2 size={14} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold">{item.name}</span>
                    <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{taskSummary(item)}</span>
                  </span>
                  <span className={cn("size-1.5 shrink-0 rounded-full", item.local ? "bg-emerald-500" : "bg-muted-foreground/35")} aria-label={item.local ? "로컬" : "미클론"} />
                  <ChevronRight size={12} className={cn("shrink-0 text-muted-foreground transition-transform", active && "translate-x-0.5 text-foreground")} aria-hidden />
                </button>
              )
            })}
            {mission?.projects.length === 0 && (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground">이 미션에 배속된 프로젝트가 없습니다.</p>
            )}
          </div>
        </section>

        <ProjectDetail
          project={project}
          detail={detailState.slug === project?.name ? detailState.data : null}
          detailError={detailState.slug === project?.name ? detailState.error : null}
          issues={projectIssues}
          onClose={closeDetail}
        />
      </div>

      {lint && (lint.issues.length > 0 || lint.excludedLocalDirs.length > 0) && (
        <section aria-labelledby="lint-heading" className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="lint-heading" className="text-sm font-semibold">정합성 제안</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">자동 수정하지 않습니다. 경고를 확인한 뒤 사람이 정본에 반영합니다.</p>
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">error {lint.counts.error} · warning {lint.counts.warning} · info {lint.counts.info}</span>
          </div>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {lint.issues.filter((item) => item.severity !== "info").slice(0, 6).map((item) => (
              <LintRow key={item.id} issue={item} />
            ))}
          </ul>
          {lint.excludedLocalDirs.length > 0 && (
            <p className="mt-3 border-t border-border pt-3 text-[10px] text-muted-foreground">worktree·변형 제외: {lint.excludedLocalDirs.join(" · ")}</p>
          )}
        </section>
      )}
    </div>
  )
}

function ProjectDetail({
  project,
  detail,
  detailError,
  issues,
  onClose,
}: {
  project: ProjectSummary | null
  detail: ProjectDetailResponse | null
  detailError: string | null
  issues: LintIssue[]
  onClose: () => void
}) {
  const { containerRef, initialFocusRef, isModal } = useResponsiveDialog(Boolean(project), onClose)
  if (!project) {
    return <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">프로젝트를 선택하세요.</div>
  }
  const loading = !detail && !detailError
  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        data-work-dialog-backdrop="projects"
        aria-label="프로젝트 상세 배경 닫기"
        onClick={onClose}
        className="fixed inset-0 z-[55] bg-[#172326]/25 lg:hidden"
      />
      <aside
        ref={containerRef}
        data-work-detail-sheet="projects"
        role={isModal ? "dialog" : undefined}
        aria-modal={isModal ? true : undefined}
        aria-labelledby="project-detail-heading"
        tabIndex={isModal ? -1 : undefined}
        className="fixed inset-0 z-[60] overflow-y-auto bg-card md:inset-y-0 md:left-auto md:w-[420px] md:border-l md:border-border md:shadow-xl lg:static lg:z-auto lg:w-auto lg:min-h-80 lg:overflow-hidden lg:rounded-2xl lg:border lg:shadow-none"
      >
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="project-detail-heading" className="truncate text-base font-semibold tracking-tight">{project.name}</h2>
              {project.status && <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">{project.status}</span>}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{project.role ?? "역할 설명 없음"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full border px-2 py-1 text-[9px] font-semibold", project.local ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-border bg-muted text-muted-foreground")}>
              {project.local ? "LOCAL" : "NOT CLONED"}
            </span>
            <button ref={initialFocusRef} type="button" onClick={onClose} aria-label="프로젝트 상세 닫기" className="inline-flex size-11 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-[#146c94]"><X size={18} aria-hidden /></button>
          </div>
        </div>
        {issues.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50/60 px-3 py-2 text-[10px] text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden /> 이 프로젝트의 정합성 제안 {issues.length}건
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {!project.local && (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 text-center">
            <FolderGit2 size={19} className="text-muted-foreground" aria-hidden />
            <p className="mt-3 text-xs font-semibold">이 노트북에 클론되지 않았습니다.</p>
            <p className="mt-1 max-w-md text-[10px] leading-relaxed text-muted-foreground">Task 수를 0으로 추정하지 않습니다. 로컬 레포가 연결되면 goals/를 읽습니다.</p>
          </div>
        )}
        {project.local && loading && (
          <div className="flex min-h-48 items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" aria-hidden /> Task를 읽는 중</div>
        )}
        {project.local && detailError && (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-amber-300/70 bg-amber-50/60 px-4 text-center dark:bg-amber-950/20">
            <CircleAlert size={18} className="text-amber-600" aria-hidden />
            <p className="mt-2 text-xs font-semibold">Task 상세를 읽지 못했습니다.</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{detailError}</p>
          </div>
        )}
        {project.local && detail && detail.goals.length === 0 && (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 text-center">
            <CheckCircle2 size={18} className="text-muted-foreground" aria-hidden />
            <p className="mt-2 text-xs font-semibold">등록된 Goal이 없습니다.</p>
            <p className="mt-1 text-[10px] text-muted-foreground">goals/ 부재와 빈 디렉터리는 프로젝트 목록에서 구분합니다.</p>
          </div>
        )}
        {project.local && detail && detail.goals.length > 0 && (
          <div className="space-y-2">
            {detail.goals.map((goal) => <GoalRow key={goal.file} goal={goal} />)}
          </div>
        )}
      </div>
      </aside>
    </>
  )
}

function GoalRow({ goal }: { goal: GoalTask }) {
  const progress = goal.checks.total > 0 ? Math.round((goal.checks.done / goal.checks.total) * 100) : null
  return (
    <article className="rounded-xl border border-border bg-background p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">{goal.title}</p>
          <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground">{goal.file}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {goal.priority && <span className="rounded-md border border-border px-1.5 py-0.5 text-[9px] font-semibold">{goal.priority}</span>}
          <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-semibold", statusTone(goal.status))}>{goal.status ?? "NO STATUS"}</span>
        </div>
      </div>
      {progress !== null && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
            <span>Completion Check</span>
            <span className="tabular-nums">{goal.checks.done}/{goal.checks.total} · {progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[#ff5c28]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </article>
  )
}

function LintRow({ issue }: { issue: LintIssue }) {
  return (
    <li className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
      {issue.severity === "error" ? <CircleAlert size={13} className="mt-0.5 shrink-0 text-rose-600" aria-hidden /> : <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />}
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold">{issue.project ?? "생태계"}{issue.file ? ` · ${issue.file}` : ""}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">{issue.message}</span>
      </span>
    </li>
  )
}
