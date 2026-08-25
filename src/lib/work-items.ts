import type { CalendarOccurrence, CalendarResponse, TodoItem, TodosResponse } from "@/lib/types"

export type WorkSourceResult<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: string }

export type WorkItemSource = "goal" | "doc" | "calendar"
export type WorkItemGroupKey = "now" | "today" | "upcoming" | "waiting"

export interface WorkItem {
  key: string
  source: WorkItemSource
  title: string
  completed: boolean
  date?: string
  relPath?: string
  openPath?: string
  projectName?: string
  goalId?: number
  goalStatus?: string
  priority?: "P0" | "P1" | "P2"
  calendar?: {
    sourceId: string
    occurrenceDate: string
    occurrenceId: string
  }
}
export interface WorkItemsModel {
  state: "loading" | "error" | "empty" | "partial" | "success"
  items: WorkItem[]
  groups: Array<{
    key: WorkItemGroupKey
    label: string
    items: WorkItem[]
  }>
  todaySchedule: Array<{
    key: string
    title: string
    date: string
    startTime: string | null
    endTime: string | null
  }>
  errors: string[]
}

export function canCommitWorkResponse(
  requestId: number,
  latestRequestId: number,
  aborted: boolean,
): boolean {
  return !aborted && requestId === latestRequestId
}

const WORK_GROUPS: Array<{ key: WorkItemGroupKey; label: string }> = [
  { key: "now", label: "지금" },
  { key: "today", label: "오늘" },
  { key: "upcoming", label: "예정" },
  { key: "waiting", label: "대기" },
]

function projectTodoItem(item: TodoItem): WorkItem {
  return {
    key: `${item.origin.kind}:${item.id}`,
    source: item.origin.kind,
    title: item.text,
    completed: false,
    relPath: item.relPath,
    openPath: item.origin.openPath,
    projectName: item.origin.projectName,
    goalId: item.origin.goalId,
    goalStatus: item.origin.goalStatus,
    priority: item.origin.priority,
  }
}

function projectCalendarTask(item: CalendarOccurrence): WorkItem {
  return {
    key: `calendar:${item.id}`,
    source: "calendar",
    title: item.title,
    completed: item.status === "done",
    date: item.date,
    calendar: {
      sourceId: item.sourceId,
      occurrenceDate: item.date,
      occurrenceId: item.id,
    },
  }
}

export function projectCalendarTasks(response: CalendarResponse): WorkItem[] {
  return response.occurrences
    .filter((item) => item.kind === "task" && item.status === "open")
    .map(projectCalendarTask)
}

export function isWorkItemSelectionSourceReady(
  key: string,
  todos: WorkSourceResult<TodosResponse>,
  calendar: WorkSourceResult<CalendarResponse>,
): boolean {
  if (key.startsWith("calendar:")) return calendar.status === "ready"
  if (key.startsWith("goal:") || key.startsWith("doc:")) return todos.status === "ready"
  return false
}

function groupKeyForItem(item: WorkItem, today: string): WorkItemGroupKey {
  if (item.source === "goal") {
    return item.goalStatus === "ACTIVE" || item.goalStatus === "IN_PROGRESS" ? "now" : "waiting"
  }
  if (item.source === "doc") return "waiting"
  if (item.date === today) return "today"
  if (item.date && item.date > today) return "upcoming"
  return "now"
}

export function groupWorkItems(items: WorkItem[], today: string): WorkItemsModel["groups"] {
  return WORK_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => !item.completed && groupKeyForItem(item, today) === group.key),
  }))
}

export function projectTodaySchedule(response: CalendarResponse, today: string): WorkItemsModel["todaySchedule"] {
  return response.occurrences
    .filter((item) => item.kind === "event" && item.date === today && item.status !== "canceled")
    .map((item) => ({
      key: `calendar-event:${item.id}`,
      title: item.title,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
    }))
    .sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") || a.title.localeCompare(b.title))
}

export function buildWorkItemsModel(
  todos: WorkSourceResult<TodosResponse>,
  calendar: WorkSourceResult<CalendarResponse>,
  today: string,
): WorkItemsModel {
  const items: WorkItem[] = []
  const errors: string[] = []
  let readySources = 0
  let loadingSources = 0

  if (todos.status === "ready") {
    readySources += 1
    items.push(...todos.data.todos.map(projectTodoItem))
  } else if (todos.status === "loading") {
    loadingSources += 1
  } else {
    errors.push(`Goal·문서: ${todos.error}`)
  }

  if (calendar.status === "ready") {
    readySources += 1
    items.push(...projectCalendarTasks(calendar.data))
  } else if (calendar.status === "loading") {
    loadingSources += 1
  } else {
    errors.push(`Calendar: ${calendar.error}`)
  }

  const finish = (state: WorkItemsModel["state"]): WorkItemsModel => ({
    state,
    items,
    groups: groupWorkItems(items, today),
    todaySchedule: calendar.status === "ready" ? projectTodaySchedule(calendar.data, today) : [],
    errors,
  })

  if (readySources === 0 && loadingSources > 0) return finish("loading")
  if (readySources === 0) return finish("error")
  if (errors.length > 0 || loadingSources > 0) return finish("partial")
  if (items.length === 0) return finish("empty")
  return finish("success")
}

export function buildCalendarCompletionRequest(item: WorkItem): {
  action: "set_task_completion"
  id: string
  occurrenceDate: string
  done: boolean
} | null {
  if (item.source !== "calendar" || !item.calendar) return null
  return {
    action: "set_task_completion",
    id: item.calendar.sourceId,
    occurrenceDate: item.calendar.occurrenceDate,
    done: !item.completed,
  }
}
