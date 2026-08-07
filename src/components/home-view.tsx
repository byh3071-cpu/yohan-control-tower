"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Code2,
  FolderKanban,
  Inbox,
  Loader2,
} from "lucide-react"
import type { DocFilter } from "@/lib/doc-scope"
import type { Stats, TodoItem, TodosResponse } from "@/lib/types"
import type { ViewTab } from "@/components/view-tabs"
import { cn } from "@/lib/utils"

interface HomeViewProps {
  stats: Stats
  docCounts: Record<string, number>
  gaps: number
  dashboardError: string | null
  onNavigate: (tab: ViewTab, category?: DocFilter) => void
  onOpenInbox: () => void
  onOpenDoc: (relPath: string) => void
}

const PRIORITY_RANK: Record<string, number> = { P0: 0, P1: 1, P2: 2 }

function todoRank(item: TodoItem): number {
  const active = item.origin.goalStatus === "ACTIVE" || item.origin.goalStatus === "IN_PROGRESS"
  return (active ? 0 : item.origin.kind === "doc" ? 10 : 20) + (PRIORITY_RANK[item.origin.priority ?? "P2"] ?? 2)
}

function formatToday(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date())
}

export function HomeView({
  stats,
  docCounts,
  gaps,
  dashboardError,
  onNavigate,
  onOpenInbox,
  onOpenDoc,
}: HomeViewProps) {
  const [todoData, setTodoData] = useState<TodosResponse | null>(null)
  const [todoError, setTodoError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/todos?t=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<TodosResponse>
      })
      .then((data) => {
        if (alive) setTodoData(data)
      })
      .catch((error: unknown) => {
        if (alive) setTodoError(error instanceof Error ? error.message : String(error))
      })
    return () => {
      alive = false
    }
  }, [])

  const topTodos = useMemo(
    () => [...(todoData?.todos ?? [])].sort((a, b) => todoRank(a) - todoRank(b)).slice(0, 3),
    [todoData]
  )
  const today = useMemo(() => formatToday(), [])
  const skillAssets = (docCounts.rules ?? 0) + (docCounts.templates ?? 0)

  return (
    <div className="min-h-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-[#ff5c28]" aria-hidden />
              Today
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">오늘의 관제탑</h1>
            <p suppressHydrationWarning className="mt-1.5 text-sm text-muted-foreground">
              {today} · 지금 결정할 것만 앞에 둡니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenInbox}
            className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg bg-foreground px-3.5 text-xs font-semibold text-background transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#ff5c28] sm:self-auto"
          >
            <Inbox size={14} aria-hidden />
            빠른 메모
          </button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(10,10,10,0.03)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">지금 할 일</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Goal과 문서의 다음 액션에서 우선순위 순으로 가져옵니다.</p>
              </div>
              {todoData && (
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  전체 {todoData.total}
                </span>
              )}
            </div>

            <div className="min-h-[210px] px-3 py-2 sm:px-4">
              {!todoData && !todoError && (
                <div className="flex min-h-[194px] items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" aria-hidden /> 할 일을 모으는 중
                </div>
              )}

              {todoError && (
                <div className="flex min-h-[194px] flex-col items-center justify-center text-center">
                  <CircleAlert size={18} className="mb-2 text-amber-600" aria-hidden />
                  <p className="text-xs font-medium">할 일 원장을 불러오지 못했어요.</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{todoError} · 프로젝트 탭에서 경로 설정을 확인하세요.</p>
                </div>
              )}

              {todoData && topTodos.length === 0 && (
                <div className="flex min-h-[194px] flex-col items-center justify-center text-center">
                  <CheckCircle2 size={20} className="mb-2 text-emerald-600" aria-hidden />
                  <p className="text-xs font-medium">지금 잡힌 다음 행동이 없습니다.</p>
                  <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                    모든 일이 끝난 상태이거나 로컬 브레인 경로가 아직 연결되지 않았습니다.
                  </p>
                </div>
              )}

              {topTodos.length > 0 && (
                <ol className="divide-y divide-border">
                  {topTodos.map((todo, index) => {
                    const openPath = todo.origin.openPath
                    return (
                      <li key={todo.id}>
                        <button
                          type="button"
                          onClick={() => openPath ? onOpenDoc(openPath) : onNavigate("projects")}
                          className="group flex w-full items-start gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring sm:px-2"
                        >
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold tabular-nums text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium leading-relaxed text-foreground sm:text-[13px]">{todo.text}</span>
                            <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                              {todo.origin.kind === "goal"
                                ? `${todo.origin.goalTitle ?? "Goal"} · ${todo.origin.priority ?? "P2"}`
                                : `${todo.heading} · ${todo.relPath}`}
                            </span>
                          </span>
                          <ArrowRight size={14} className="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-[11px] sm:px-5">
              <span className={cn("text-muted-foreground", todoData?.missingDirs.length && "text-amber-700 dark:text-amber-400")}>
                {todoData?.missingDirs.length
                  ? `확인할 스캔 경로 ${todoData.missingDirs.length}개`
                  : "보이는 항목은 로컬 원장의 미완료 항목입니다."}
              </span>
              <button type="button" onClick={() => onNavigate("projects")} className="font-semibold hover:underline hover:underline-offset-4">
                전체 보기
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">관제 신호</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">숫자보다 연결 상태를 먼저 봅니다.</p>
              </div>
              <span
                className={cn("size-2 rounded-full", dashboardError ? "bg-amber-500" : "bg-emerald-500")}
                title={dashboardError ? "로컬 원장 연결 확인 필요" : "대시보드 응답 정상"}
              />
            </div>

            <dl className="divide-y divide-border">
              <SignalRow
                label="지식 원장"
                value={dashboardError ? "확인 필요" : `${stats.totalDocs}개 문서`}
                detail={dashboardError ? "YOHAN_OS_ROOT와 Brain 연결을 확인하세요." : gaps > 0 ? `status 미기입 ${gaps}개` : "관리 상태 정리됨"}
                attention={Boolean(dashboardError) || gaps > 0}
              />
              <SignalRow
                label="Skill 자산"
                value={dashboardError ? "확인 필요" : `${skillAssets}개`}
                detail={dashboardError ? "Brain 문서 집계 불가" : `규칙 ${docCounts.rules ?? 0} · 템플릿 ${docCounts.templates ?? 0}`}
                attention={Boolean(dashboardError)}
              />
              <SignalRow
                label="수집 파이프라인"
                value={dashboardError ? "확인 필요" : `${stats.ingests}건`}
                detail={dashboardError ? "Brain 문서 집계 불가" : stats.batchStatus === "error" ? "최근 배치 확인 필요" : "누적 인제스트"}
                attention={Boolean(dashboardError) || stats.batchStatus === "error"}
              />
              <SignalRow label="AI 실행 추적" value="설계 대기" detail="공통 Run ID · 승인 · Rollback" muted />
              <SignalRow label="외부 원장" value="연결 대기" detail="캘린더 · 재무" muted />
            </dl>
            <button
              type="button"
              onClick={onOpenInbox}
              className="mt-4 flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-[10px] font-semibold transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              승인 큐 열기
              <ArrowRight size={12} aria-hidden />
            </button>
          </section>
        </div>

        <section aria-labelledby="ecosystem-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="ecosystem-heading" className="text-sm font-semibold tracking-tight">요한 생태계</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Home은 요약만, 깊은 작업은 각 원장에서 이어갑니다.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <EcosystemCard
              icon={<FolderKanban size={16} />}
              eyebrow="Work"
              title="프로젝트와 할 일"
              description={todoData ? `미완료 ${todoData.total}개 · 캘린더는 연결 전` : "Goal과 다음 액션을 한 흐름으로"}
              action="프로젝트 열기"
              onClick={() => onNavigate("projects")}
            />
            <EcosystemCard
              icon={<BookOpen size={16} />}
              eyebrow="Knowledge"
              title="브레인과 지식"
              description={dashboardError ? "로컬 Brain 연결 확인 필요" : `문서 ${stats.totalDocs}개 · 결정 ${stats.decisions}개`}
              action="문서 열기"
              onClick={() => onNavigate("docs", "all")}
            />
            <EcosystemCard
              icon={<Code2 size={16} />}
              eyebrow="Build & Skills"
              title="VHK · MCP · Skills"
              description={dashboardError ? "실행·도구 레지스트리 연결 확인 필요" : `규칙·템플릿 ${skillAssets}개 · AI 작업 근거`}
              action="규칙 보기"
              onClick={() => onNavigate("docs", "rules")}
            />
            <EcosystemCard
              icon={<CircleDollarSign size={16} />}
              eyebrow="Finance"
              title="생활 재무 원장"
              description="거래 원장 미연결 · 월간 소비 회고 준비"
              status="준비"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-[11px] text-muted-foreground">
            <CalendarDays size={14} className="shrink-0" aria-hidden />
            일정·반복·알림은 캘린더 원장이 연결되면 Work 카드에 흡수됩니다. 별도 여섯 번째 탭은 만들지 않습니다.
          </div>
        </section>
      </main>
    </div>
  )
}

function SignalRow({
  label,
  value,
  detail,
  attention = false,
  muted = false,
}: {
  label: string
  value: string
  detail: string
  attention?: boolean
  muted?: boolean
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3 py-3 first:pt-0 last:pb-0">
      <dt className="text-[11px] font-medium">{label}</dt>
      <dd className={cn("text-[11px] font-semibold tabular-nums", attention && "text-amber-700 dark:text-amber-400", muted && "text-muted-foreground")}>
        {value}
      </dd>
      <dd className="col-span-2 mt-0.5 text-[10px] text-muted-foreground">{detail}</dd>
    </div>
  )
}

function EcosystemCard({
  icon,
  eyebrow,
  title,
  description,
  action,
  onClick,
  status,
}: {
  icon: ReactNode
  eyebrow: string
  title: string
  description: string
  action?: string
  onClick?: () => void
  status?: string
}) {
  const content = (
    <>
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground" aria-hidden>
          {icon}
        </span>
        {status && <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground">{status}</span>}
      </div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
      <h3 className="mt-1 text-[13px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 min-h-8 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      {action && (
        <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold">
          {action} <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      )}
    </>
  )

  if (!onClick) {
    return <article className="rounded-xl border border-border bg-card p-4 opacity-75">{content}</article>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-border bg-card p-4 text-left transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </button>
  )
}
