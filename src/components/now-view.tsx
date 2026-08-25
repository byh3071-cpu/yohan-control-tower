"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Flag, Loader2, RotateCcw } from "lucide-react"

import { selectNowTask, type NowTaskSelection } from "@/lib/now-task"
import type { TodosResponse } from "@/lib/types"

interface NowViewProps {
  onOpenProjects: () => void
}

function formatObservedAt(value: string | undefined): string {
  if (!value) return "기준 시각 확인 필요"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "기준 시각 확인 필요"
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function goalLabel(id: number | null): string {
  return id == null ? "GOAL" : `GOAL ${id}`
}

export function NowView({ onOpenProjects }: NowViewProps) {
  const [todoData, setTodoData] = useState<TodosResponse | null>(null)
  const [todoError, setTodoError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let alive = true
    fetch(`/api/todos?t=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as TodosResponse
        if (!response.ok || !data.ok) throw new Error(`HTTP ${response.status}`)
        if (!data.goalScope?.ok) throw new Error(data.goalScope?.error ?? "프로젝트 Goal 원장 연결 실패")
        return data
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
  }, [requestVersion])

  const selection = useMemo<NowTaskSelection | null>(
    () => todoData ? selectNowTask(todoData.todos) : null,
    [todoData],
  )

  const retry = () => {
    setTodoData(null)
    setTodoError(null)
    setRequestVersion((current) => current + 1)
  }

  if (todoError) {
    return (
      <NowShell>
        <NowHero
          path="GOAL · 작업 원장"
          code="SOURCE CHECK · NOW"
          title="작업 원장 확인이 필요합니다."
          summary="현재 Task를 정하기 전에 로컬 Goal 데이터를 다시 불러와야 합니다."
          status="확인 필요"
          progress="데이터 연결 실패"
          observed="기준 시각 없음"
          action={(
            <PrimaryButton onClick={retry} icon={<RotateCcw size={17} aria-hidden />}>
              다시 불러오기
            </PrimaryButton>
          )}
        />
        <Facts
          leftLabel="문제"
          leftValue={todoError}
          rightLabel="데이터 원장"
          rightValue="로컬 goals/*.md · /api/todos"
        />
        <NextStep title="연결이 복구되면 활성 Goal 수부터 다시 확인합니다." detail="실패 상태에서 Task를 추정하지 않습니다." />
      </NowShell>
    )
  }

  if (!todoData || !selection) {
    return (
      <NowShell ariaLive="polite">
        <NowHero
          path="GOAL · 작업 원장"
          code="LOADING · NOW"
          title="지금 할 일을 확인하는 중입니다."
          summary="로컬 Goal과 미완료 Completion Check를 읽고 있습니다."
          status="확인 중"
          progress="Task 선택 전"
          observed="기준 시각 확인 중"
          action={<Loader2 size={22} className="animate-spin text-[#146c94]" aria-label="불러오는 중" />}
        />
      </NowShell>
    )
  }

  const observed = formatObservedAt(todoData.generatedAt)
  const coverage = `로컬 ${todoData.goalScope.localProjects} / ${todoData.goalScope.configuredProjects}`

  if (selection.kind === "selection-required") {
    return (
      <NowShell>
        <NowHero
          path={`GOAL · 활성 Goal ${selection.goals.length}개`}
          code="DECISION · NOW"
          title="우선 작업 확인이 필요합니다."
          summary="현재 PC에서 동시에 진행 중인 Goal이 있어 관제탑이 하나를 임의로 고르지 않았습니다."
          status="확인 필요"
          progress={`활성 Goal ${selection.goals.length}개`}
          observed={`기준 ${observed} · ${coverage}`}
          action={<PrimaryButton onClick={onOpenProjects}>작업 목록 열기</PrimaryButton>}
        />
        <section className="border-y border-[#b9c5c8]" aria-labelledby="competing-goals-title">
          <h2 id="competing-goals-title" className="sr-only">동시에 진행 중인 Goal</h2>
          <ul className="divide-y divide-[#c5ced1]">
            {selection.goals.map((goal) => (
              <li key={goal.key} className="grid gap-2 py-5 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
                <span className="text-sm font-bold tracking-[0.1em] text-[#146c94]">{goalLabel(goal.id)}</span>
                <div className="min-w-0">
                  <strong className="block text-base leading-6">{goal.title}</strong>
                  {goal.projectName && <span className="mt-1 block text-sm text-[#526367] dark:text-[#a9b7ba]">{goal.projectName}</span>}
                </div>
                <span className="text-sm text-[#526367] dark:text-[#a9b7ba]">남은 Task {goal.remaining}개</span>
              </li>
            ))}
          </ul>
        </section>
        <NextStep title="작업 화면에서 지금 진행할 Goal을 하나로 정리합니다." detail="결정 전에는 priority나 번호로 자동 선택하지 않습니다." />
      </NowShell>
    )
  }

  if (selection.kind === "empty") {
    return (
      <NowShell>
        <NowHero
          path="GOAL · 활성 작업 없음"
          code="NO ACTIVE TASK · NOW"
          title="진행할 작업이 없습니다."
          summary="현재 PC에서 읽을 수 있는 진행 중 Goal의 미완료 Task가 없거나 아직 활성 Goal이 정해지지 않았습니다."
          status="대기"
          progress="현재 Task 0개"
          observed={`기준 ${observed} · ${coverage}`}
          action={<PrimaryButton onClick={onOpenProjects}>작업 목록 확인</PrimaryButton>}
        />
        <Facts
          leftLabel="판정 기준"
          leftValue="ACTIVE 또는 IN_PROGRESS Goal의 미완료 Task"
          rightLabel="데이터 원장"
          rightValue="로컬 goals/*.md · /api/todos"
        />
        <NextStep title="새 Goal을 시작하거나 대기 중인 Goal의 상태를 확인합니다." detail="문서 Todo는 현재 Goal Task로 대신 표시하지 않습니다." />
      </NowShell>
    )
  }

  const percent = Math.round((selection.done / selection.total) * 100)
  return (
    <NowShell>
      <NowHero
        path={`${goalLabel(selection.goal.id)} · ${selection.goal.title}`}
        code={`TASK ${selection.current} / ${selection.total} · NOW`}
        title={selection.task.text}
        summary="현재 PC에서 읽을 수 있는 이 Goal의 첫 번째 미완료 작업입니다."
        status="진행"
        progress={`Goal 진행 ${selection.done} / ${selection.total} 완료`}
        observed={`기준 ${observed} · ${coverage}`}
        action={<PrimaryButton onClick={onOpenProjects}>프로젝트에서 확인</PrimaryButton>}
      />
      <div className="h-1 bg-[#c9d3d6]" role="progressbar" aria-label="Goal 완료 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-full bg-[#146c94] transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <Facts
        leftLabel="완료 기준"
        leftValue={selection.task.text}
        rightLabel="기준 문서"
        rightValue={selection.task.relPath}
      />
      <NextStep
        title={selection.nextTask?.text ?? "현재 Task가 마지막입니다. Goal 완료 여부를 확인합니다."}
        detail={selection.nextTask ? `${goalLabel(selection.goal.id)}의 다음 미완료 Task` : "남은 Completion Check를 다시 확인합니다."}
      />
    </NowShell>
  )
}

function NowShell({ children, ariaLive }: { children: React.ReactNode; ariaLive?: "polite" }) {
  return (
    <div className="min-h-full bg-[#e7ecee] text-[#172326] dark:bg-[#101719] dark:text-[#eef3f4]" aria-live={ariaLive}>
      <main className="mx-auto w-full max-w-[1176px] px-4 pb-14 pt-8 sm:px-6 sm:pt-11 lg:px-8">
        {children}
      </main>
    </div>
  )
}

function NowHero({ path, code, title, summary, status, progress, observed, action }: {
  path: string
  code: string
  title: string
  summary: string
  status: string
  progress: string
  observed: string
  action: React.ReactNode
}) {
  return (
    <section className="border-b border-[#b9c5c8] pb-9 sm:pb-10" aria-labelledby="now-title">
      <p className="mb-5 text-sm font-semibold text-[#526367] dark:text-[#a9b7ba]">
        <span className="text-[#146c94] dark:text-[#66b8dd]">{path}</span>
      </p>
      <p className="mb-4 font-mono text-sm font-bold uppercase tracking-[0.1em] text-[#146c94] dark:text-[#66b8dd]">{code}</p>
      <h1 id="now-title" className="max-w-[1100px] text-[clamp(2.25rem,5vw,3.375rem)] font-bold leading-[1.08] tracking-[-0.045em] text-balance">
        {title}
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-7 text-[#526367] dark:text-[#a9b7ba]">{summary}</p>
      <div className="mt-6 flex flex-col gap-5 text-sm sm:flex-row sm:flex-wrap sm:items-center" aria-label="현재 작업 상태">
        <strong className="inline-flex items-center gap-2 text-[15px]">
          <Flag size={17} className="text-[#146c94]" aria-hidden />
          {status}
        </strong>
        <span className="hidden h-[18px] w-px bg-[#aebbbf] sm:block" aria-hidden />
        <span className="text-[#526367] dark:text-[#a9b7ba]">{progress}</span>
        <span className="hidden h-[18px] w-px bg-[#aebbbf] sm:block" aria-hidden />
        <span className="text-[#526367] dark:text-[#a9b7ba]">{observed}</span>
        <div className="sm:ml-auto">{action}</div>
      </div>
    </section>
  )
}

function PrimaryButton({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 min-w-44 items-center justify-center gap-2 border border-[#0f5574] bg-[#146c94] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0f5d82] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c94] focus-visible:ring-offset-2 focus-visible:ring-offset-[#e7ecee]"
    >
      {icon}
      {children}
      {!icon && <ArrowRight size={17} aria-hidden />}
    </button>
  )
}

function Facts({ leftLabel, leftValue, rightLabel, rightValue }: {
  leftLabel: string
  leftValue: string
  rightLabel: string
  rightValue: string
}) {
  return (
    <section className="grid border-b border-[#b9c5c8] sm:grid-cols-2" aria-label="현재 작업의 확인 정보">
      <div className="py-5 sm:pr-6">
        <span className="text-sm text-[#526367] dark:text-[#a9b7ba]">{leftLabel}</span>
        <strong className="mt-2 block break-words text-base leading-6">{leftValue}</strong>
      </div>
      <div className="border-t border-[#c5ced1] py-5 sm:border-l sm:border-t-0 sm:pl-6">
        <span className="text-sm text-[#526367] dark:text-[#a9b7ba]">{rightLabel}</span>
        <strong className="mt-2 block break-words text-base leading-6">{rightValue}</strong>
      </div>
    </section>
  )
}

function NextStep({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="mt-7 grid gap-3 border-t-2 border-[#9eacb0] pt-5 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-6" aria-label="다음 작업">
      <span className="font-mono text-sm font-bold uppercase tracking-[0.1em]">NEXT</span>
      <div>
        <strong className="text-[17px] leading-7">{title}</strong>
        <p className="mt-1 text-sm leading-6 text-[#526367] dark:text-[#a9b7ba]">{detail}</p>
      </div>
    </section>
  )
}
