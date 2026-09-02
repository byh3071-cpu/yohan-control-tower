"use client"

import { FormEvent, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Repeat2,
  RotateCcw,
  Trash2,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DAILY_SURFACE, DAILY_VISUAL, buildQuickAddTaskInput, pillColorForKind } from "@/lib/daily-visual"
import { cn } from "@/lib/utils"
import { resolveCalendarViewState, seoulDate } from "@/lib/work-navigation"
import type {
  CalendarCreateInput,
  CalendarItemKind,
  CalendarOccurrence,
  CalendarRecurrence,
  CalendarResponse,
  CalendarTrashItem,
  CalendarTrashResponse,
} from "@/lib/types"

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]

type CalendarMode = "month" | "list"

interface CalendarViewProps {
  initialDate?: string
  initialMode?: CalendarMode
  selectedItemId?: string | null
  onLocationChange?: (location: { date?: string; mode?: CalendarMode; item?: string }, replace?: boolean) => void
}

interface CreateFormState {
  kind: CalendarItemKind
  title: string
  date: string
  startTime: string
  endTime: string
  recurrence: CalendarRecurrence
  recurrenceInterval: string
  recurrenceUntil: string
  notes: string
}

interface CalendarRangeState {
  key: string
  status: "loading" | "ready" | "error"
  data: CalendarResponse | null
  error: string | null
}

function parseYmd(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function shiftUtcDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number)
  return ymd(new Date(Date.UTC(year, monthNumber - 1 + amount, 1))).slice(0, 7)
}

function monthGrid(month: string): { days: string[]; from: string; to: string } {
  const [year, monthNumber] = month.split("-").map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const last = new Date(Date.UTC(year, monthNumber, 0))
  const mondayOffset = (first.getUTCDay() + 6) % 7
  const start = shiftUtcDays(first, -mondayOffset)
  const endOffset = 6 - ((last.getUTCDay() + 6) % 7)
  const end = shiftUtcDays(last, endOffset)
  const days: string[] = []
  for (let cursor = start; cursor <= end; cursor = shiftUtcDays(cursor, 1)) days.push(ymd(cursor))
  return { days, from: ymd(start), to: ymd(end) }
}

function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", timeZone: "UTC" })
    .format(parseYmd(`${month}-01`))
}

function formatSelectedDate(date: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "UTC",
  }).format(parseYmd(date))
}

function formatDeletedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value))
}

function emptyForm(date: string, kind: CalendarItemKind = "task"): CreateFormState {
  return {
    kind,
    title: "",
    date,
    startTime: "",
    endTime: "",
    recurrence: "none",
    recurrenceInterval: "1",
    recurrenceUntil: "",
    notes: "",
  }
}

function formFromOccurrence(item: CalendarOccurrence): CreateFormState {
  return {
    kind: item.kind,
    title: item.title,
    date: item.sourceDate,
    startTime: item.startTime ?? "",
    endTime: item.endTime ?? "",
    recurrence: item.recurrence,
    recurrenceInterval: String(item.recurrenceInterval),
    recurrenceUntil: item.recurrenceUntil ?? "",
    notes: item.notes,
  }
}

function recurrenceLabel(item: CalendarOccurrence): string {
  if (!item.recurring) return ""
  const unit = item.recurrence === "daily" ? "일" : item.recurrence === "weekly" ? "주" : "개월"
  return item.recurrenceInterval === 1 ? `${unit === "일" ? "매일" : unit === "주" ? "매주" : "매월"}` : `${item.recurrenceInterval}${unit}마다`
}

async function fetchCalendarRange(from: string, to: string, signal?: AbortSignal): Promise<CalendarResponse> {
  const response = await fetch(`/api/calendar?from=${from}&to=${to}&t=${Date.now()}`, { cache: "no-store", signal })
  const payload = await response.json() as CalendarResponse
  if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
  return payload
}

export function CalendarView({
  initialDate,
  initialMode,
  selectedItemId = null,
  onLocationChange,
}: CalendarViewProps = {}) {
  const today = seoulDate()
  const urlState = useMemo(
    () => resolveCalendarViewState(initialDate, initialMode, today),
    [initialDate, initialMode, today],
  )
  const [month, setMonth] = useState(urlState.month)
  const [selectedDate, setSelectedDate] = useState(urlState.selectedDate)
  const [mode, setMode] = useState<CalendarMode>(urlState.mode)
  const [rangeState, setRangeState] = useState<CalendarRangeState>({ key: "", status: "loading", data: null, error: null })
  const [actionError, setActionError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CalendarOccurrence | null>(null)
  const [form, setForm] = useState<CreateFormState>(() => emptyForm(today))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<CalendarOccurrence | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [lastTrashed, setLastTrashed] = useState<CalendarTrashItem | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashData, setTrashData] = useState<CalendarTrashResponse | null>(null)
  const [trashLoading, setTrashLoading] = useState(false)
  const [trashError, setTrashError] = useState<string | null>(null)
  const [restoringTrashId, setRestoringTrashId] = useState<string | null>(null)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickSaving, setQuickSaving] = useState(false)
  const requestSequenceRef = useRef(0)
  const activeRequestRef = useRef<{ id: number; key: string; controller: AbortController } | null>(null)
  const editTriggerRef = useRef<HTMLButtonElement | null>(null)
  const fallbackFocusRef = useRef<HTMLButtonElement | null>(null)
  const dismissedSelectionRef = useRef<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedDate(urlState.selectedDate)
      setMonth(urlState.month)
      setMode(urlState.mode)
    }, 0)
    return () => clearTimeout(timer)
  }, [urlState])

  const grid = useMemo(() => monthGrid(month), [month])
  const rangeKey = `${grid.from}:${grid.to}`
  const locationMonth = initialDate?.slice(0, 7) ?? month
  const locationRangePending = locationMonth !== month
  const rangeIsCurrent = !locationRangePending && rangeState.key === rangeKey
  const data = rangeIsCurrent ? rangeState.data : null
  const loading = !rangeIsCurrent || rangeState.status === "loading"
  const error = loading ? null : rangeState.status === "error" ? rangeState.error : actionError
  const locationDate = initialDate ?? selectedDate
  const locationMode = initialMode ?? mode

  const load = useCallback(async () => {
    const requestId = requestSequenceRef.current + 1
    requestSequenceRef.current = requestId
    activeRequestRef.current?.controller.abort()
    const controller = new AbortController()
    activeRequestRef.current = { id: requestId, key: rangeKey, controller }
    setRangeState((current) => current.key === rangeKey && current.data
      ? { key: rangeKey, status: "loading", data: current.data, error: null }
      : { key: rangeKey, status: "loading", data: null, error: null })
    setActionError(null)
    try {
      const payload = await fetchCalendarRange(grid.from, grid.to, controller.signal)
      if (activeRequestRef.current?.id !== requestId) return
      setRangeState({ key: rangeKey, status: "ready", data: payload, error: null })
    } catch (loadError: unknown) {
      if (controller.signal.aborted || activeRequestRef.current?.id !== requestId) return
      setRangeState({
        key: rangeKey,
        status: "error",
        data: null,
        error: loadError instanceof Error ? loadError.message : String(loadError),
      })
    } finally {
      if (activeRequestRef.current?.id === requestId) activeRequestRef.current = null
    }
  }, [grid.from, grid.to, rangeKey])

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0)
    return () => {
      clearTimeout(timer)
      const active = activeRequestRef.current
      if (active?.key === rangeKey) active.controller.abort()
    }
  }, [load, rangeKey])

  const byDate = useMemo(() => {
    const grouped = new Map<string, CalendarOccurrence[]>()
    for (const occurrence of data?.occurrences ?? []) {
      const list = grouped.get(occurrence.date) ?? []
      list.push(occurrence)
      grouped.set(occurrence.date, list)
    }
    return grouped
  }, [data])

  const selectedItems = byDate.get(selectedDate) ?? []
  const monthItems = useMemo(
    () => (data?.occurrences ?? []).filter((item) => item.date.startsWith(`${month}-`)),
    [data, month]
  )
  const monthGroups = useMemo(() => {
    const groups: Array<{ date: string; items: CalendarOccurrence[] }> = []
    for (const occurrence of monthItems) {
      const last = groups.at(-1)
      if (last?.date === occurrence.date) last.items.push(occurrence)
      else groups.push({ date: occurrence.date, items: [occurrence] })
    }
    return groups
  }, [monthItems])

  const selectedOccurrenceId = selectedItemId?.startsWith("calendar:")
    ? selectedItemId.slice("calendar:".length)
    : null
  const restoredSelection = selectedOccurrenceId
    ? (data?.occurrences ?? []).find((item) => item.id === selectedOccurrenceId) ?? null
    : null

  const resolveEditFinalFocus = useCallback((): HTMLElement | false => {
    const trigger = editTriggerRef.current
    if (trigger?.isConnected) return trigger
    const fallback = fallbackFocusRef.current
    return fallback?.isConnected ? fallback : false
  }, [])

  useEffect(() => {
    if (!editingItem) return
    const editingItemKey = `calendar:${editingItem.id}`
    if (selectedItemId === editingItemKey) return
    if (!selectedItemId) dismissedSelectionRef.current = null
    const timer = setTimeout(() => {
      setCreateOpen(false)
      setEditingItem(null)
      setSaveError(null)
    }, 0)
    return () => clearTimeout(timer)
  }, [editingItem, selectedItemId])

  useEffect(() => {
    if (!selectedItemId || loading || !data || error) return
    if (dismissedSelectionRef.current && dismissedSelectionRef.current !== selectedItemId) {
      dismissedSelectionRef.current = null
    }
    if (dismissedSelectionRef.current === selectedItemId) return
    const timer = setTimeout(() => {
      if (!restoredSelection) {
        onLocationChange?.({ date: locationDate, mode: locationMode }, true)
        return
      }
      if (editingItem?.id !== restoredSelection.id) {
        setEditingItem(restoredSelection)
        setForm(formFromOccurrence(restoredSelection))
        setSaveError(null)
        setCreateOpen(true)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [data, editingItem?.id, error, loading, locationDate, locationMode, onLocationChange, restoredSelection, selectedItemId])

  function openCreate(kind: CalendarItemKind) {
    editTriggerRef.current = null
    setEditingItem(null)
    setForm(emptyForm(selectedDate, kind))
    setSaveError(null)
    setCreateOpen(true)
  }

  function openEdit(item: CalendarOccurrence, trigger: HTMLButtonElement) {
    editTriggerRef.current = trigger
    dismissedSelectionRef.current = null
    setEditingItem(item)
    setForm(formFromOccurrence(item))
    setSaveError(null)
    setCreateOpen(true)
    onLocationChange?.({ date: item.date, mode, item: `calendar:${item.id}` })
  }

  function moveMonth(amount: number) {
    const next = shiftMonth(month, amount)
    const nextDate = `${next}-01`
    setActionError(null)
    setMonth(next)
    setSelectedDate(nextDate)
    onLocationChange?.({ date: nextDate, mode })
  }

  function goToday() {
    const targetDate = seoulDate()
    const targetMonth = targetDate.slice(0, 7)
    if (targetMonth !== month) {
      setActionError(null)
      setMonth(targetMonth)
    }
    setSelectedDate(targetDate)
    onLocationChange?.({ date: targetDate, mode })
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    const input: CalendarCreateInput = {
      kind: form.kind,
      title: form.title,
      date: form.date,
      startTime: form.startTime || null,
      endTime: form.kind === "event" ? form.endTime || null : null,
      recurrence: form.recurrence,
      recurrenceInterval: Number(form.recurrenceInterval),
      recurrenceUntil: form.recurrence === "none" ? null : form.recurrenceUntil || null,
      notes: form.notes,
    }
    try {
      const response = await fetch("/api/calendar", {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem ? {
          action: "update_item",
          id: editingItem.sourceId,
          expectedUpdatedAt: editingItem.sourceUpdatedAt,
          ...input,
        } : input),
      })
      const payload = await response.json() as { ok?: boolean; setupRequired?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
      if (selectedItemId) {
        dismissedSelectionRef.current = selectedItemId
        onLocationChange?.({ date: form.date, mode }, true)
      }
      setCreateOpen(false)
      setEditingItem(null)
      const targetMonth = form.date.slice(0, 7)
      setSelectedDate(form.date)
      setActionError(null)
      if (targetMonth === month) await load()
      else setMonth(targetMonth)
    } catch (submitError: unknown) {
      setSaveError(submitError instanceof Error ? submitError.message : String(submitError))
    } finally {
      setSaving(false)
    }
  }

  async function submitQuickAdd() {
    const input = buildQuickAddTaskInput(selectedDate, quickTitle)
    if (!input) return
    setQuickSaving(true)
    setActionError(null)
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const payload = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
      setQuickTitle("")
      const targetMonth = input.date.slice(0, 7)
      if (targetMonth === month) await load()
      else setMonth(targetMonth)
    } catch (quickError: unknown) {
      setActionError(quickError instanceof Error ? quickError.message : String(quickError))
    } finally {
      setQuickSaving(false)
    }
  }

  async function toggleTask(item: CalendarOccurrence) {
    setPendingTaskId(item.id)
    setActionError(null)
    try {
      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_task_completion",
          id: item.sourceId,
          occurrenceDate: item.date,
          done: item.status !== "done",
        }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
      await load()
    } catch (toggleError: unknown) {
      setActionError(toggleError instanceof Error ? toggleError.message : String(toggleError))
    } finally {
      setPendingTaskId(null)
    }
  }

  async function loadTrash() {
    setTrashLoading(true)
    setTrashError(null)
    try {
      const response = await fetch(`/api/calendar?view=trash&t=${Date.now()}`, { cache: "no-store" })
      const payload = await response.json() as CalendarTrashResponse
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
      setTrashData(payload)
    } catch (loadError: unknown) {
      setTrashError(loadError instanceof Error ? loadError.message : String(loadError))
    } finally {
      setTrashLoading(false)
    }
  }

  function openTrash() {
    setTrashOpen(true)
    void loadTrash()
  }

  function openDelete(item: CalendarOccurrence) {
    setDeleteCandidate(item)
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!deleteCandidate) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const response = await fetch("/api/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deleteCandidate.sourceId,
          expectedUpdatedAt: deleteCandidate.sourceUpdatedAt,
        }),
      })
      const payload = await response.json() as { ok?: boolean; item?: CalendarTrashItem; error?: string }
      if (!response.ok || !payload.ok || !payload.item) throw new Error(payload.error ?? `HTTP ${response.status}`)
      setLastTrashed(payload.item)
      setDeleteCandidate(null)
      await load()
    } catch (removeError: unknown) {
      setDeleteError(removeError instanceof Error ? removeError.message : String(removeError))
    } finally {
      setDeleting(false)
    }
  }

  async function restoreTrashItem(item: CalendarTrashItem) {
    setRestoringTrashId(item.trashId)
    setTrashError(null)
    setActionError(null)
    try {
      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore_item", trashId: item.trashId }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
      if (lastTrashed?.trashId === item.trashId) setLastTrashed(null)
      await load()
      if (trashOpen) await loadTrash()
    } catch (restoreError: unknown) {
      const message = restoreError instanceof Error ? restoreError.message : String(restoreError)
      if (trashOpen) setTrashError(message)
      else setActionError(message)
    } finally {
      setRestoringTrashId(null)
    }
  }

  if (data?.setupRequired) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
        <CalendarDays size={24} className="mx-auto mb-3 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold">Calendar 원장 경로를 연결하세요.</h2>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
          <code>YOHAN_CALENDAR_ROOT</code>에 개인 일정 파일을 둘 절대경로를 지정하면 첫 항목 생성 시 <code>items/</code>가 만들어집니다.
        </p>
        {data.error && <p className="mx-auto mt-3 max-w-xl text-[11px] text-amber-700 dark:text-amber-300">{data.error}</p>}
      </section>
    )
  }

  return (
    <section aria-label="로컬 캘린더" data-calendar-date={selectedDate} data-calendar-mode={mode} data-surface={DAILY_SURFACE} className="space-y-4 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-[22px] font-bold tracking-[-0.04em]" style={{ color: DAILY_VISUAL.ink }}>{formatMonth(month)}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarPill ref={fallbackFocusRef} data-calendar-focus-fallback onClick={goToday}>오늘</ToolbarPill>
          <ToolbarPill onClick={() => moveMonth(-1)} aria-label="이전 달"><ChevronLeft size={16} aria-hidden /></ToolbarPill>
          <ToolbarPill onClick={() => moveMonth(1)} aria-label="다음 달"><ChevronRight size={16} aria-hidden /></ToolbarPill>
          <ToolbarPill
            aria-pressed={mode === "list"}
            aria-label="월간과 목록 전환"
            onClick={() => {
              const next = mode === "month" ? "list" : "month"
              setMode(next)
              onLocationChange?.({ date: selectedDate, mode: next })
            }}
            active={mode === "list"}
          >
            ALL
          </ToolbarPill>
          <button type="button" onClick={openTrash} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold" style={{ borderColor: DAILY_VISUAL.line, color: DAILY_VISUAL.muted }}>
            <Trash2 size={12} aria-hidden /> 휴지통
          </button>
          <button
            type="button"
            data-daily-add
            onClick={() => openCreate("event")}
            className="daily-add inline-flex items-center gap-1 rounded-full px-3.5 text-[13px] font-bold"
            style={{ background: DAILY_VISUAL.roseFill, color: DAILY_VISUAL.roseDeep }}
          >
            <Plus size={13} aria-hidden /> 일정 추가
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {lastTrashed && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs" style={{ borderColor: DAILY_VISUAL.line, background: DAILY_VISUAL.bg }}>
          <span><strong>{lastTrashed.title}</strong>을(를) 휴지통으로 이동했습니다.</span>
          <button type="button" disabled={restoringTrashId === lastTrashed.trashId} onClick={() => restoreTrashItem(lastTrashed)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50" style={{ color: DAILY_VISUAL.roseDeep }}>
            {restoringTrashId === lastTrashed.trashId ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            되돌리기
          </button>
        </div>
      )}

      {data && data.issues.length > 0 && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 px-3 py-2.5 text-[11px] text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          원장 파일 {data.issues.length}개를 읽지 못했습니다. {data.issues[0].file}: {data.issues[0].message}
        </div>
      )}

      {loading && !data ? (
        <div className="flex min-h-96 items-center justify-center gap-2 rounded-[14px] border text-xs" style={{ borderColor: DAILY_VISUAL.line, color: DAILY_VISUAL.muted, background: DAILY_VISUAL.bg }}>
          <Loader2 size={15} className="animate-spin" aria-hidden /> Calendar 원장을 읽는 중
        </div>
      ) : mode === "month" ? (
        <div className="grid gap-3.5 min-[1024px]:grid-cols-[minmax(0,1fr)_328px]">
          <DayAgenda
            className="order-1 lg:order-2"
            date={selectedDate}
            items={selectedItems}
            pendingTaskId={pendingTaskId}
            quickTitle={quickTitle}
            quickSaving={quickSaving}
            onQuickTitleChange={setQuickTitle}
            onQuickAdd={submitQuickAdd}
            onToggleTask={toggleTask}
            onEdit={openEdit}
            onDelete={openDelete}
          />

          <div className="order-2 overflow-hidden rounded-[14px] border lg:order-1 min-w-0" style={{ borderColor: DAILY_VISUAL.line, background: DAILY_VISUAL.bg }}>
            <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${DAILY_VISUAL.line}` }}>
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="py-2 text-center text-[11px] font-medium" style={{ color: DAILY_VISUAL.muted }}>{weekday}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.days.map((date) => (
                <CalendarDay
                  key={date}
                  date={date}
                  currentMonth={month}
                  today={today}
                  selected={date === selectedDate}
                  items={byDate.get(date) ?? []}
                  onClick={() => { setSelectedDate(date); onLocationChange?.({ date, mode }) }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border min-w-0" style={{ borderColor: DAILY_VISUAL.line, background: DAILY_VISUAL.bg }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: DAILY_VISUAL.line }}>
            <div>
              <h1 className="text-xl font-bold tracking-[-0.03em]" style={{ color: DAILY_VISUAL.ink }}>{formatSelectedDate(selectedDate)}</h1>
              <p className="mt-0.5 text-xs" style={{ color: DAILY_VISUAL.muted }}>{formatMonth(month)} 목록</p>
            </div>
            <span className="rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums" style={{ background: DAILY_VISUAL.roseFill, color: DAILY_VISUAL.roseDeep }}>{monthItems.length}개</span>
          </div>
          {monthGroups.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <CalendarDays size={20} className="mb-2" style={{ color: DAILY_VISUAL.muted }} aria-hidden />
              <p className="text-xs font-medium">이번 달 항목이 없습니다.</p>
              <p className="mt-1 text-[10px]" style={{ color: DAILY_VISUAL.muted }}>필요한 일정이나 할 일을 바로 추가하세요.</p>
            </div>
          ) : (
            <div>
              {monthGroups.map((group) => (
                <div key={group.date} className="grid gap-2 px-4 py-4 sm:grid-cols-[150px_1fr] sm:px-5" style={{ borderTop: `1px solid ${DAILY_VISUAL.line}` }}>
                  <button type="button" onClick={() => { setSelectedDate(group.date); setMode("month"); onLocationChange?.({ date: group.date, mode: "month" }) }} className="self-start min-h-11 text-left text-sm font-semibold focus-visible:ring-2" style={{ color: DAILY_VISUAL.ink }}>
                    {formatSelectedDate(group.date)}
                  </button>
                  <div className="space-y-2">
                    {group.items.map((item) => <AgendaItem key={item.id} item={item} pending={pendingTaskId === item.id} onToggleTask={toggleTask} onEdit={openEdit} onDelete={openDelete} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        data-daily-add
        onClick={() => openCreate("event")}
        aria-label="일정 추가"
        className="daily-add fixed bottom-5 right-5 z-20 flex size-11 items-center justify-center rounded-full md:hidden"
        style={{ background: DAILY_VISUAL.rose, color: DAILY_VISUAL.checkMark }}
      >
        <Plus size={18} aria-hidden />
      </button>

      <CreateCalendarDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            const wasEditing = editingItem !== null
            if (wasEditing && selectedItemId) {
              dismissedSelectionRef.current = selectedItemId
              onLocationChange?.({ date: locationDate, mode: locationMode }, true)
            }
            setEditingItem(null)
          }
        }}
        finalFocus={resolveEditFinalFocus}
        editing={editingItem}
        form={form}
        setForm={setForm}
        saving={saving}
        error={saveError}
        onSubmit={submitItem}
      />
      <DeleteCalendarDialog
        item={deleteCandidate}
        deleting={deleting}
        error={deleteError}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteCandidate(null)
        }}
        onConfirm={confirmDelete}
      />
      <TrashCalendarDialog
        open={trashOpen}
        onOpenChange={setTrashOpen}
        data={trashData}
        loading={trashLoading}
        error={trashError}
        restoringTrashId={restoringTrashId}
        onReload={loadTrash}
        onRestore={restoreTrashItem}
      />
    </section>
  )
}

const ToolbarPill = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }>(function ToolbarPill({
  active = false,
  children,
  className,
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn("inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-[13px] font-semibold", className)}
      style={{
        borderColor: DAILY_VISUAL.line,
        background: active ? DAILY_VISUAL.roseFill : DAILY_VISUAL.bg,
        color: active ? DAILY_VISUAL.roseDeep : DAILY_VISUAL.toolInk,
      }}
      {...props}
    >
      {children}
    </button>
  )
})

function CalendarDay({ date, currentMonth, today, selected, items, onClick }: {
  date: string
  currentMonth: string
  today: string
  selected: boolean
  items: CalendarOccurrence[]
  onClick: () => void
}) {
  const inMonth = date.startsWith(`${currentMonth}-`)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${formatSelectedDate(date)}, ${items.length}개 항목`}
      onClick={onClick}
      className="relative min-h-16 min-w-0 p-1.5 text-left outline-none sm:min-h-24 sm:p-2"
      style={{
        borderRight: `1px solid ${DAILY_VISUAL.line}`,
        borderBottom: `1px solid ${DAILY_VISUAL.line}`,
        color: inMonth ? DAILY_VISUAL.ink : DAILY_VISUAL.outMonth,
        background: selected ? DAILY_VISUAL.selectedWash : DAILY_VISUAL.bg,
        boxShadow: selected ? `inset 0 0 0 1.5px ${DAILY_VISUAL.rose}` : undefined,
        borderRadius: selected ? 10 : 0,
      }}
    >
      <span
        className="inline-flex size-5 items-center justify-center rounded-lg text-[12px] font-semibold tabular-nums sm:size-[22px] sm:text-[12px]"
        style={date === today || selected ? { color: DAILY_VISUAL.roseDeep, background: DAILY_VISUAL.roseFill } : undefined}
      >
        {Number(date.slice(-2))}
      </span>
      <div className="mt-1 hidden space-y-0.5 sm:block">
        {items.slice(0, 3).map((item) => (
          <span
            key={item.id}
            className={cn("block truncate rounded-[10px] px-2 py-0.5 text-[11px] font-medium leading-5", item.status === "done" && "line-through")}
            style={{ background: pillColorForKind(item.kind), color: DAILY_VISUAL.ink, opacity: item.status === "done" ? 0.55 : 1 }}
          >
            {item.startTime ? `${item.startTime} ` : ""}{item.title}
          </span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-1 sm:hidden" aria-hidden>
        {items.slice(0, 4).map((item) => (
          <span key={item.id} className="size-1.5 rounded-full" style={{ background: pillColorForKind(item.kind), opacity: item.status === "done" ? 0.35 : 1 }} />
        ))}
      </div>
      {items.length > 3 && <span className="mt-1 hidden text-[10px] font-medium sm:block" style={{ color: DAILY_VISUAL.muted }}>+{items.length - 3}</span>}
    </button>
  )
}

function DayAgenda({ className, date, items, pendingTaskId, quickTitle, quickSaving, onQuickTitleChange, onQuickAdd, onToggleTask, onEdit, onDelete }: {
  className?: string
  date: string
  items: CalendarOccurrence[]
  pendingTaskId: string | null
  quickTitle: string
  quickSaving: boolean
  onQuickTitleChange: (value: string) => void
  onQuickAdd: () => void
  onToggleTask: (item: CalendarOccurrence) => void
  onEdit: (item: CalendarOccurrence, trigger: HTMLButtonElement) => void
  onDelete: (item: CalendarOccurrence) => void
}) {
  const quickPlaceholder = formatQuickPlaceholder(date)
  return (
    <aside aria-label="선택한 날짜 일정" className={cn("flex min-h-[min(720px,70vh)] flex-col rounded-[14px] border p-4", className)} style={{ borderColor: DAILY_VISUAL.line, background: DAILY_VISUAL.bg }}>
      <h1 className="text-xl font-bold tracking-[-0.03em]" style={{ color: DAILY_VISUAL.ink }}>{formatSelectedDate(date)}</h1>
      {items.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center text-center sm:min-h-52">
          <CalendarDays size={19} className="mb-2" style={{ color: DAILY_VISUAL.muted }} aria-hidden />
          <p className="text-xs font-medium">비어 있는 날입니다.</p>
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-0">
          {items.map((item) => <AgendaItem key={item.id} item={item} pending={pendingTaskId === item.id} onToggleTask={onToggleTask} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      )}
      <form
        className="mt-auto flex items-center gap-2 rounded-full border px-3.5 py-1.5"
        style={{ borderColor: DAILY_VISUAL.line, background: DAILY_VISUAL.quickFill }}
        onSubmit={(event) => {
          event.preventDefault()
          onQuickAdd()
        }}
      >
        <input
          value={quickTitle}
          onChange={(event) => onQuickTitleChange(event.target.value)}
          aria-label="빠른 추가"
          placeholder={quickPlaceholder}
          maxLength={160}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: DAILY_VISUAL.ink }}
        />
        <button
          type="submit"
          aria-label="추가"
          disabled={quickSaving}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold disabled:opacity-50"
          style={{ background: DAILY_VISUAL.rose, color: DAILY_VISUAL.checkMark }}
        >
          {quickSaving ? <Loader2 size={14} className="animate-spin" /> : "↑"}
        </button>
      </form>
    </aside>
  )
}

function AgendaItem({ item, pending, onToggleTask, onEdit, onDelete }: {
  item: CalendarOccurrence
  pending: boolean
  onToggleTask: (item: CalendarOccurrence) => void
  onEdit: (item: CalendarOccurrence, trigger: HTMLButtonElement) => void
  onDelete: (item: CalendarOccurrence) => void
}) {
  const done = item.status === "done"
  return (
    <div className="grid items-center gap-2 py-2" style={{ gridTemplateColumns: item.kind === "event" ? "4px 44px minmax(0,1fr) auto" : "44px minmax(0,1fr) auto", borderBottom: `1px solid ${DAILY_VISUAL.line}` }}>
      {item.kind === "event" && <span className="h-[22px] w-1 rounded" style={{ background: DAILY_VISUAL.eventAccent }} aria-hidden />}
      {item.kind === "task" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => onToggleTask(item)}
          aria-label={done ? `${item.title} 다시 열기` : `${item.title} 완료`}
          className="flex size-11 items-center justify-center disabled:opacity-50"
        >
          <span
            className="relative flex size-[18px] items-center justify-center rounded-full border-[1.5px]"
            style={{
              background: done ? DAILY_VISUAL.rose : DAILY_VISUAL.bg,
              borderColor: done ? DAILY_VISUAL.rose : DAILY_VISUAL.checkBorder,
            }}
          >
            {pending ? <Loader2 size={10} className="animate-spin" style={{ color: DAILY_VISUAL.roseDeep }} /> : done ? <Check size={10} strokeWidth={3} style={{ color: DAILY_VISUAL.checkMark }} /> : null}
          </span>
        </button>
      ) : (
        <span className="size-11" aria-hidden />
      )}
      <div className="min-w-0">
        <p className={cn("text-sm font-medium leading-relaxed", done && "line-through")} style={{ color: done ? DAILY_VISUAL.strike : DAILY_VISUAL.ink }}>{item.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: DAILY_VISUAL.muted }}>
          {item.startTime && <span className="inline-flex items-center gap-1"><Clock3 size={10} />{item.startTime}{item.endTime ? `–${item.endTime}` : ""}</span>}
          {item.recurring && <span className="inline-flex items-center gap-1"><Repeat2 size={10} />{recurrenceLabel(item)}</span>}
          {!item.startTime && <span>{item.kind === "task" ? "시간 없는 할 일" : "종일"}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <button type="button" data-calendar-edit-id={item.id} onClick={(event) => onEdit(item, event.currentTarget)} aria-label={`${item.title} 수정`} className="flex size-11 items-center justify-center rounded-lg" style={{ color: DAILY_VISUAL.muted }}>
          <Pencil size={12} aria-hidden />
        </button>
        <button type="button" onClick={() => onDelete(item)} aria-label={`${item.title} 휴지통으로 이동`} className="flex size-11 items-center justify-center rounded-lg" style={{ color: DAILY_VISUAL.muted }}>
          <Trash2 size={12} aria-hidden />
        </button>
      </div>
    </div>
  )
}

function formatQuickPlaceholder(date: string): string {
  const parsed = parseYmd(date)
  return `${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()} 빠른 추가 — Enter`
}

function DeleteCalendarDialog({ item, deleting, error, onOpenChange, onConfirm }: {
  item: CalendarOccurrence | null
  deleting: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent data-work-calendar-dialog className="[&_button]:min-h-[45px] [&_button]:min-w-[45px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>휴지통으로 이동</DialogTitle>
          <DialogDescription>원본 파일은 삭제되지 않으며 휴지통에서 다시 복구할 수 있습니다.</DialogDescription>
        </DialogHeader>
        {item && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-3">
              <p className="text-xs font-semibold">{item.title}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{item.kind === "event" ? "일정" : "할 일"} · {formatSelectedDate(item.sourceDate)}</p>
            </div>
            {item.recurring && <p className="rounded-lg bg-[#ff5c28]/10 px-3 py-2 text-[11px] leading-relaxed text-[#b83c16] dark:text-orange-300">반복 전체가 휴지통으로 이동합니다. 선택한 날짜 한 번만 이동하는 기능은 아직 제공하지 않습니다.</p>}
          </div>
        )}
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        <DialogFooter className="mx-0 mb-0 rounded-lg px-0 pb-0">
          <button type="button" disabled={deleting} onClick={() => onOpenChange(false)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted">취소</button>
          <button type="button" disabled={deleting} onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-50">
            {deleting && <Loader2 size={13} className="animate-spin" />} 휴지통으로 이동
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TrashCalendarDialog({ open, onOpenChange, data, loading, error, restoringTrashId, onReload, onRestore }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: CalendarTrashResponse | null
  loading: boolean
  error: string | null
  restoringTrashId: string | null
  onReload: () => void
  onRestore: (item: CalendarTrashItem) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-work-calendar-dialog className="max-h-[85vh] overflow-y-auto [&_button]:min-h-[45px] [&_button]:min-w-[45px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Calendar 휴지통</DialogTitle>
          <DialogDescription>항목은 영구 삭제되지 않습니다. 필요한 항목을 원래 Calendar로 복구할 수 있습니다.</DialogDescription>
        </DialogHeader>
        {loading && !data ? (
          <div className="flex min-h-36 items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> 휴지통을 읽는 중</div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <p>{error}</p>
            <button type="button" onClick={onReload} className="mt-2 font-semibold underline underline-offset-4">다시 시도</button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center text-center">
            <Trash2 size={20} className="mb-2 text-muted-foreground" aria-hidden />
            <p className="text-xs font-medium">휴지통이 비어 있습니다.</p>
            <p className="mt-1 text-[10px] text-muted-foreground">이동한 일정과 할 일이 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.issues.length > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] text-amber-800">휴지통 파일 {data.issues.length}개를 읽지 못했습니다.</p>}
            {data.items.map((item) => (
              <div key={item.trashId} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
                <span className={cn("size-2 shrink-0", item.kind === "event" ? "rounded-full bg-[#ff5c28]" : "rounded-[2px] border border-foreground/60")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{item.title}</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">{item.kind === "event" ? "일정" : "할 일"} · {item.date} · {formatDeletedAt(item.deletedAt)} 삭제</p>
                </div>
                <button type="button" disabled={restoringTrashId === item.trashId} onClick={() => onRestore(item)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[10px] font-semibold hover:bg-muted disabled:opacity-50">
                  {restoringTrashId === item.trashId ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />} 복구
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateCalendarDialog({ open, onOpenChange, finalFocus, editing, form, setForm, saving, error, onSubmit }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  finalFocus: () => HTMLElement | false
  editing: CalendarOccurrence | null
  form: CreateFormState
  setForm: React.Dispatch<React.SetStateAction<CreateFormState>>
  saving: boolean
  error: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const recurrenceUnit = form.recurrence === "daily" ? "일" : form.recurrence === "weekly" ? "주" : "개월"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent finalFocus={finalFocus} data-work-calendar-dialog className="max-h-[90vh] overflow-y-auto [&_button]:min-h-[45px] [&_button]:min-w-[45px] [&_input]:min-h-[45px] [&_select]:min-h-[45px] [&_textarea]:min-h-[45px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? form.kind === "event" ? "일정 수정" : "할 일 수정" : form.kind === "event" ? "새 일정" : "새 할 일"}</DialogTitle>
          <DialogDescription>
            {editing?.recurring ? "반복 전체 수정: 이 변경은 선택한 날짜 한 번이 아니라 원본 반복 항목에 적용됩니다." : editing ? "원본 항목을 수정합니다. 종류는 생성 후 바꿀 수 없습니다." : "일정은 시간 블록, 할 일은 완료 가능한 항목으로 저장됩니다."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {editing ? (
            <div className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold">{form.kind === "task" ? "할 일" : "일정"}</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              {(["task", "event"] as const).map((kind) => (
                <button key={kind} type="button" onClick={() => setForm((current) => ({ ...current, kind, endTime: kind === "task" ? "" : current.endTime }))} className={cn("rounded-md px-3 py-2 text-xs font-semibold", form.kind === kind ? "bg-background shadow-sm" : "text-muted-foreground")}>{kind === "task" ? "할 일" : "일정"}</button>
              ))}
            </div>
          )}

          <Field label="제목">
            <input autoFocus required maxLength={160} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="calendar-input" placeholder={form.kind === "task" ? "예: 피아노 20분 연습" : "예: 제품 리뷰"} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="날짜"><input required type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="calendar-input" /></Field>
            <Field label={form.kind === "task" ? "시간 (선택)" : "시작 시간 (선택)"}><input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className="calendar-input" /></Field>
          </div>
          {form.kind === "event" && <Field label="종료 시간 (선택)"><input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className="calendar-input" /></Field>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="반복">
              <select value={form.recurrence} onChange={(event) => setForm((current) => ({ ...current, recurrence: event.target.value as CalendarRecurrence }))} className="calendar-input">
                <option value="none">반복 안 함</option><option value="daily">매일</option><option value="weekly">매주</option><option value="monthly">매월</option>
              </select>
            </Field>
            {form.recurrence !== "none" && <Field label="반복 간격"><div className="flex items-center gap-2"><input required type="number" min={1} max={365} value={form.recurrenceInterval} onChange={(event) => setForm((current) => ({ ...current, recurrenceInterval: event.target.value }))} className="calendar-input" /><span className="shrink-0 text-[11px] text-muted-foreground">{recurrenceUnit}마다</span></div></Field>}
          </div>
          {form.recurrence !== "none" && <Field label="반복 종료일 (선택)"><input type="date" min={form.date} value={form.recurrenceUntil} onChange={(event) => setForm((current) => ({ ...current, recurrenceUntil: event.target.value }))} className="calendar-input" /></Field>}

          <Field label="메모 (선택)"><textarea maxLength={10000} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="calendar-input min-h-20 resize-y" placeholder="필요한 맥락만 짧게 남기세요." /></Field>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <DialogFooter className="mx-0 mb-0 rounded-lg px-0 pb-0">
            <button type="button" disabled={saving} onClick={() => onOpenChange(false)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted">취소</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-50">{saving && <Loader2 size={13} className="animate-spin" />}{editing ? "변경 저장" : form.kind === "event" ? "일정 저장" : "할 일 저장"}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-semibold">{label}</span>{children}</label>
}
