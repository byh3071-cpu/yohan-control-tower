"use client"

import { AlertTriangle, CalendarCheck2, CheckSquare2, Clock3, FileText, Flag, Loader2, RefreshCw, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useResponsiveDialog } from "@/components/use-responsive-dialog"
import { buildCalendarCompletionRequest, buildWorkItemsModel, canCommitWorkResponse, isWorkItemSelectionSourceReady, type WorkItem, type WorkItemGroupKey, type WorkSourceResult } from "@/lib/work-items"
import { cn } from "@/lib/utils"
import { seoulDate } from "@/lib/work-navigation"
import type { CalendarResponse, TodosResponse } from "@/lib/types"

interface TodoViewProps {
  onSelectDoc: (relPath: string) => void
  selectedItemKey?: string | null
  onSelectedItemChange?: (key: string | null, replace?: boolean) => void
}

function addUtcDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal })
  const payload = await response.json() as T & { ok?: boolean; error?: string }
  if (!response.ok || payload.ok === false) throw new Error(payload.error ?? `HTTP ${response.status}`)
  return payload
}

const SOURCE_COPY: Record<WorkItem["source"], { label: string; icon: typeof Flag }> = {
  goal: { label: "Goal", icon: Flag },
  doc: { label: "문서", icon: FileText },
  calendar: { label: "Calendar", icon: CalendarCheck2 },
}

type TodoFilter = "all" | WorkItemGroupKey

const FILTERS: Array<{ key: TodoFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "now", label: "지금" },
  { key: "today", label: "오늘" },
  { key: "upcoming", label: "예정" },
  { key: "waiting", label: "대기" },
]

function scheduleTime(startTime: string | null, endTime: string | null): string {
  if (startTime && endTime) return `${startTime}–${endTime}`
  if (startTime) return `${startTime} 시작`
  return "시간 미지정"
}

export function TodoView({ onSelectDoc, selectedItemKey = null, onSelectedItemChange }: TodoViewProps) {
  const [todos, setTodos] = useState<WorkSourceResult<TodosResponse>>({ status: "loading" })
  const [calendar, setCalendar] = useState<WorkSourceResult<CalendarResponse>>({ status: "loading" })
  const [requestVersion, setRequestVersion] = useState(0)
  const [today, setToday] = useState(seoulDate)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [filter, setFilter] = useState<TodoFilter>("all")
  const rowRefs = useRef(new Map<string, HTMLButtonElement>())
  const selectedRef = useRef<string | null>(null)
  const requestSequenceRef = useRef(0)
  const activeRequestRef = useRef<{ id: number; controller: AbortController } | null>(null)

  useEffect(() => {
    const requestId = requestSequenceRef.current + 1
    requestSequenceRef.current = requestId
    activeRequestRef.current?.controller.abort()
    const controller = new AbortController()
    activeRequestRef.current = { id: requestId, controller }
    const isCurrent = () => canCommitWorkResponse(requestId, requestSequenceRef.current, controller.signal.aborted)
    const timer = setTimeout(() => {
      const from = seoulDate()
      const to = addUtcDays(from, 45)
      setToday(from)
      setTodos({ status: "loading" })
      setCalendar({ status: "loading" })
      const todosRequest = readJson<TodosResponse>(`/api/todos?t=${Date.now()}`, controller.signal)
        .then((data) => {
          if (isCurrent()) setTodos({ status: "ready", data })
        })
        .catch((error: unknown) => {
          if (isCurrent()) setTodos({ status: "error", error: error instanceof Error ? error.message : String(error) })
        })
      const calendarRequest = readJson<CalendarResponse>(`/api/calendar?from=${from}&to=${to}&t=${Date.now()}`, controller.signal)
        .then((data) => {
          if (data.setupRequired) throw new Error(data.error ?? "Calendar 원장 연결 필요")
          if (isCurrent()) setCalendar({ status: "ready", data })
        })
        .catch((error: unknown) => {
          if (isCurrent()) setCalendar({ status: "error", error: error instanceof Error ? error.message : String(error) })
        })
      void Promise.allSettled([todosRequest, calendarRequest]).then(() => {
        if (activeRequestRef.current?.id === requestId) activeRequestRef.current = null
      })
    }, 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [requestVersion])

  const model = useMemo(() => buildWorkItemsModel(todos, calendar, today), [calendar, today, todos])
  const groupCounts = useMemo(() => Object.fromEntries(model.groups.map((group) => [group.key, group.items.length])) as Record<WorkItemGroupKey, number>, [model.groups])
  const visibleGroups = useMemo(
    () => model.groups.filter((group) => (filter === "all" || group.key === filter) && group.items.length > 0),
    [filter, model.groups],
  )
  const visibleItems = useMemo(() => visibleGroups.flatMap((group) => group.items), [visibleGroups])
  const selected = model.items.find((item) => item.key === selectedItemKey) ?? null
  const staleSelection = Boolean(selectedItemKey && isWorkItemSelectionSourceReady(selectedItemKey, todos, calendar) && !selected)

  useEffect(() => {
    if (!staleSelection || !onSelectedItemChange) return
    const timer = setTimeout(() => onSelectedItemChange(null, true), 0)
    return () => clearTimeout(timer)
  }, [onSelectedItemChange, staleSelection])

  const closeDetail = useCallback(() => {
    const previous = selectedRef.current
    onSelectedItemChange?.(null)
    requestAnimationFrame(() => {
      if (previous) rowRefs.current.get(previous)?.focus()
    })
  }, [onSelectedItemChange])

  const { containerRef: detailRef, initialFocusRef: detailCloseRef, isModal } = useResponsiveDialog(Boolean(selected), closeDetail)

  useEffect(() => {
    if (!selected) return
    selectedRef.current = selected.key
  }, [selected])

  const selectItem = (key: string) => {
    selectedRef.current = key
    onSelectedItemChange?.(key)
  }

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Enter") {
      event.preventDefault()
      const item = visibleItems[index]
      if (item) selectItem(item.key)
      return
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
    event.preventDefault()
    const next = Math.max(0, Math.min(visibleItems.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))
    rowRefs.current.get(visibleItems[next]?.key ?? "")?.focus()
  }

  const toggleCalendarTask = async (item: WorkItem) => {
    const body = buildCalendarCompletionRequest(item)
    if (!body) return
    setPendingKey(item.key)
    try {
      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
      setRequestVersion((version) => version + 1)
    } catch (error: unknown) {
      setCalendar({ status: "error", error: error instanceof Error ? error.message : String(error) })
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <section aria-label="통합 할 일" className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 border border-[#b9c5c8] bg-[#f7f9f9]">
        <div className="flex min-h-14 items-start justify-between gap-3 border-b border-[#c5ced1] px-4 py-3 sm:items-center">
          <div>
            <h2 className="text-base font-bold">통합 할 일</h2>
            <p className="mt-1 text-sm text-[#526367]">각 행의 source가 완료 권한을 결정합니다.</p>
          </div>
          <button type="button" onClick={() => setRequestVersion((version) => version + 1)} className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border border-[#b9c5c8] px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c94]">
            <RefreshCw size={16} aria-hidden /> 새로고침
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#c5ced1] px-4 py-3" aria-label="할 일 그룹 필터">
          {FILTERS.map((item) => {
            const count = item.key === "all" ? model.items.length : groupCounts[item.key]
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c94]",
                  filter === item.key ? "border-[#146c94] bg-[#e7eff5] text-[#172326]" : "border-[#b9c5c8] text-[#526367] hover:bg-[#eef3f6]",
                )}
              >
                {item.label}<span className="tabular-nums" aria-label={`${count}건`}>{count}</span>
              </button>
            )
          })}
        </div>

        {model.state === "loading" && (
          <div className="flex min-h-72 items-center justify-center gap-2 text-base text-[#526367]" role="status">
            <Loader2 size={18} className="animate-spin" aria-hidden /> 할 일을 읽는 중입니다.
          </div>
        )}

        {model.errors.length > 0 && (
          <div className="flex items-start gap-2 border-b border-[#d5b38e] bg-[#fff4e8] px-4 py-3 text-sm text-[#784016]" role="status">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
            <span><strong>{model.state === "error" ? "할 일을 불러오지 못했습니다." : "일부 원장을 읽지 못했습니다."}</strong> {model.errors.join(" · ")}</span>
          </div>
        )}

        {todos.status === "ready" && todos.data.missingDirs.length > 0 && (
          <div className="flex items-start gap-2 border-b border-[#d5b38e] bg-[#fff4e8] px-4 py-3 text-sm text-[#784016]" role="status">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
            <span><strong>스캔 경로 {todos.data.missingDirs.length}개 없음:</strong> {todos.data.missingDirs.join(" · ")}</span>
          </div>
        )}

        {model.state === "empty" && (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
            <CheckSquare2 size={22} className="text-[#526367]" aria-hidden />
            <p className="mt-3 text-base font-bold">표시할 미완료 작업이 없습니다.</p>
            <p className="mt-1 text-sm text-[#526367]">Goal·문서·Calendar 원장은 서로 독립적으로 유지됩니다.</p>
          </div>
        )}

        {model.items.length > 0 && visibleGroups.length === 0 && (
          <div className="min-h-48 px-5 py-12 text-center">
            <p className="text-base font-bold">이 그룹에 해당하는 할 일이 없습니다.</p>
            <button type="button" onClick={() => setFilter("all")} className="mt-3 min-h-11 px-3 text-sm font-bold text-[#146c94] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c94]">전체 보기</button>
          </div>
        )}

        {visibleGroups.length > 0 && (
          <div className="space-y-6 px-4 py-5">
            {visibleGroups.map((group) => (
              <section key={group.key} aria-labelledby={`todo-group-${group.key}`}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h3 id={`todo-group-${group.key}`} className="text-base font-bold">{group.label}</h3>
                  <span className="text-sm tabular-nums text-[#526367]">{group.items.length}</span>
                </div>
                <ul className="divide-y divide-[#c5ced1] border-y border-[#c5ced1]" aria-label={`${group.label} 할 일 목록`} role="listbox">
                  {group.items.map((item) => {
                    const source = SOURCE_COPY[item.source]
                    const Icon = source.icon
                    const active = item.key === selected?.key
                    const index = visibleItems.findIndex((visibleItem) => visibleItem.key === item.key)
                    return (
                      <li key={item.key}>
                        <button
                          ref={(node) => {
                            if (node) rowRefs.current.set(item.key, node)
                            else rowRefs.current.delete(item.key)
                          }}
                          type="button"
                          role="option"
                          data-work-item-key={item.key}
                          aria-selected={active}
                          onClick={() => selectItem(item.key)}
                          onKeyDown={(event) => handleListKeyDown(event, index)}
                          className={cn(
                            "grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#146c94] sm:grid-cols-[112px_minmax(0,1fr)_auto]",
                            active ? "bg-[#e7eff5]" : "hover:bg-[#eef3f6]",
                          )}
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#526367]"><Icon size={16} aria-hidden />{source.label}</span>
                          <span className={cn("text-base leading-6", item.completed && "line-through text-[#526367]")}>{item.title}</span>
                          <span className="col-start-2 text-sm text-[#526367] sm:col-start-auto">{item.date ?? item.projectName ?? (item.goalId ? `Goal ${item.goalId}` : "읽기 전용")}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {todos.status === "ready" && (
          <p className="border-t border-[#c5ced1] px-4 py-3 text-sm leading-6 text-[#526367]">수집 범위: {todos.data.scanned.length > 0 ? todos.data.scanned.join(" · ") : "구성된 Goal·문서 경로"}</p>
        )}
      </div>

      {selected && (
        <button
          type="button"
          tabIndex={-1}
          data-work-dialog-backdrop="todo"
          aria-label="할 일 상세 배경 닫기"
          onClick={closeDetail}
          className="fixed inset-0 z-[55] bg-[#172326]/25 lg:hidden"
        />
      )}

      <aside
        ref={detailRef}
        data-work-detail-sheet="todo"
        role={selected && isModal ? "dialog" : undefined}
        aria-modal={selected && isModal ? true : undefined}
        aria-labelledby={selected ? "todo-detail-heading" : undefined}
        tabIndex={selected && isModal ? -1 : undefined}
        className={cn(
          "bg-[#f7f9f9] p-5 lg:self-start lg:border lg:border-[#b9c5c8]",
          selected && "fixed inset-0 z-[60] overflow-y-auto md:inset-y-0 md:left-auto md:w-[420px] md:border-l md:border-[#b9c5c8] md:shadow-xl lg:static lg:z-auto lg:w-auto lg:shadow-none",
        )}
        aria-label={selected ? undefined : "오늘 일정"}
      >
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-[#c5ced1] pb-4">
              <div>
                <p className="text-sm font-bold text-[#146c94]">{SOURCE_COPY[selected.source].label}</p>
                <h2 id="todo-detail-heading" className="mt-2 text-xl font-bold leading-7">{selected.title}</h2>
              </div>
              <button ref={detailCloseRef} type="button" onClick={closeDetail} aria-label="할 일 상세 닫기" className="inline-flex size-11 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c94]"><X size={20} aria-hidden /></button>
            </div>
            <dl className="divide-y divide-[#c5ced1] text-base">
              <div className="py-4"><dt className="text-sm text-[#526367]">완료 소유자</dt><dd className="mt-1 font-bold">{selected.source === "calendar" ? "Calendar 원장" : "원문에서만 변경"}</dd></div>
              {selected.date && <div className="py-4"><dt className="text-sm text-[#526367]">날짜</dt><dd className="mt-1 font-bold">{selected.date}</dd></div>}
              {selected.relPath && <div className="py-4"><dt className="text-sm text-[#526367]">근거</dt><dd className="mt-1 break-words font-bold">{selected.relPath}</dd></div>}
            </dl>
            {selected.source === "calendar" && (
              <button type="button" disabled={pendingKey === selected.key} onClick={() => void toggleCalendarTask(selected)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#146c94] px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c94] focus-visible:ring-offset-2">
                {pendingKey === selected.key && <Loader2 size={16} className="animate-spin" aria-hidden />}
                {selected.completed ? "Calendar에서 다시 열기" : "Calendar에서 완료"}
              </button>
            )}
            {selected.source === "doc" && selected.openPath && (
              <button type="button" onClick={() => onSelectDoc(selected.openPath!)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center border border-[#146c94] px-4 text-sm font-bold text-[#146c94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c94]">근거 문서 열기</button>
            )}
            {selected.source === "goal" && <p className="mt-5 text-sm leading-6 text-[#526367]">Goal Completion Check는 이 화면에서 완료하지 않습니다.</p>}
          </>
        ) : (
          <>
            <div className="border-b border-[#c5ced1] pb-4">
              <p className="text-sm font-bold text-[#146c94]">CALENDAR</p>
              <h2 className="mt-2 text-xl font-bold">오늘 일정</h2>
              <p className="mt-1 text-sm text-[#526367]">{today} · 일반 할 일과 별도인 시간 블록입니다.</p>
            </div>
            {calendar.status === "loading" && <p className="py-5 text-sm text-[#526367]" role="status">오늘 일정을 읽는 중입니다.</p>}
            {calendar.status === "error" && <p className="py-5 text-sm text-[#784016]" role="status">오늘 일정을 불러오지 못했습니다.</p>}
            {calendar.status === "ready" && model.todaySchedule.length === 0 && <p className="py-5 text-sm leading-6 text-[#526367]">오늘 등록된 Calendar event가 없습니다.</p>}
            {calendar.status === "ready" && model.todaySchedule.length > 0 && (
              <ol className="divide-y divide-[#c5ced1]" aria-label="오늘 Calendar event">
                {model.todaySchedule.map((event) => (
                  <li key={event.key} className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 py-4">
                    <span className="inline-flex items-start gap-2 text-sm font-bold text-[#146c94]"><Clock3 size={16} className="mt-0.5 shrink-0" aria-hidden />{event.startTime ?? "—"}</span>
                    <span><strong className="block text-base">{event.title}</strong><span className="mt-1 block text-sm text-[#526367]">{scheduleTime(event.startTime, event.endTime)}</span></span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </aside>
    </section>
  )
}
