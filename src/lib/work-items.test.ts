import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCalendarCompletionRequest,
  buildWorkItemsModel,
  canCommitWorkResponse,
  isWorkItemSelectionSourceReady,
  projectCalendarTasks,
  type WorkSourceResult,
} from "@/lib/work-items"
import type { CalendarResponse, TodosResponse } from "@/lib/types"

const todos: TodosResponse = {
  ok: true,
  todos: [
    {
      id: "goals/23-work-sibling-views.md#aaaa1111",
      text: "URL 계약을 검증한다",
      relPath: "goals/23-work-sibling-views.md",
      line: 10,
      heading: "Completion Check",
      origin: { kind: "goal", goalId: 23, goalTitle: "작업 형제 보기", goalStatus: "IN_PROGRESS", priority: "P0" },
    },
    {
      id: "goals/24-follow-up.md#cccc3333",
      text: "후속 Goal을 준비한다",
      relPath: "goals/24-follow-up.md",
      line: 12,
      heading: "Completion Check",
      origin: { kind: "goal", goalId: 24, goalTitle: "후속 Goal", goalStatus: "NOT_STARTED", priority: "P1" },
    },
    {
      id: "memory/decisions/note.md#bbbb2222",
      text: "회의 메모를 확인한다",
      relPath: "memory/decisions/note.md",
      line: 7,
      heading: "다음 액션",
      origin: { kind: "doc", openPath: "decisions/note.md" },
    },
  ],
  total: 3,
  bySource: {},
  scanned: [],
  missingDirs: [],
  goalScope: { ok: true, configuredProjects: 1, localProjects: 1 },
  generatedAt: "2026-08-25T00:00:00.000Z",
}

const calendar: CalendarResponse = {
  ok: true,
  setupRequired: false,
  from: "2026-08-25",
  to: "2026-09-24",
  sourceItems: 3,
  issues: [],
  generatedAt: "2026-08-25T00:00:00.000Z",
  occurrences: [
    {
      id: "event-1@2026-08-25",
      sourceId: "event-1",
      sourceDate: "2026-08-25",
      sourceUpdatedAt: "2026-08-25T00:00:00.000Z",
      kind: "event",
      title: "회의",
      date: "2026-08-25",
      startTime: "10:00",
      endTime: "11:00",
      status: "open",
      recurring: false,
      recurrence: "none",
      recurrenceInterval: 1,
      recurrenceUntil: null,
      notes: "",
    },
    {
      id: "task-1@2026-08-25",
      sourceId: "task-1",
      sourceDate: "2026-08-25",
      sourceUpdatedAt: "2026-08-25T00:00:00.000Z",
      kind: "task",
      title: "QA를 마친다",
      date: "2026-08-25",
      startTime: null,
      endTime: null,
      status: "open",
      recurring: false,
      recurrence: "none",
      recurrenceInterval: 1,
      recurrenceUntil: null,
      notes: "",
    },
    {
      id: "task-2@2026-08-26",
      sourceId: "task-2",
      sourceDate: "2026-08-26",
      sourceUpdatedAt: "2026-08-25T00:00:00.000Z",
      kind: "task",
      title: "완료된 일정 할 일",
      date: "2026-08-26",
      startTime: null,
      endTime: null,
      status: "done",
      recurring: false,
      recurrence: "none",
      recurrenceInterval: 1,
      recurrenceUntil: null,
      notes: "",
    },
  ],
}

function ready<T>(data: T): WorkSourceResult<T> {
  return { status: "ready", data }
}

test("Todo refresh request fence는 최신 비취소 응답만 commit한다", () => {
  assert.equal(canCommitWorkResponse(2, 2, false), true)
  assert.equal(canCommitWorkResponse(1, 2, false), false)
  assert.equal(canCommitWorkResponse(2, 2, true), false)
})

test("Goal·문서·Calendar task를 stable key로 합성하고 event는 제외한다", () => {
  const model = buildWorkItemsModel(ready(todos), ready(calendar), "2026-08-25")
  assert.equal(model.state, "success")
  assert.deepEqual(model.items.map((item) => item.key), [
    "goal:goals/23-work-sibling-views.md#aaaa1111",
    "goal:goals/24-follow-up.md#cccc3333",
    "doc:memory/decisions/note.md#bbbb2222",
    "calendar:task-1@2026-08-25",
  ])
  assert.deepEqual(projectCalendarTasks(calendar).map((item) => item.title), ["QA를 마친다"])
})

test("지금·오늘·예정·대기를 결정론적으로 분류하고 오늘 event만 일정으로 투영한다", () => {
  const model = buildWorkItemsModel(ready(todos), ready(calendar), "2026-08-25")

  assert.deepEqual(model.groups.map((group) => [group.key, group.items.map((item) => item.title)]), [
    ["now", ["URL 계약을 검증한다"]],
    ["today", ["QA를 마친다"]],
    ["upcoming", []],
    ["waiting", ["후속 Goal을 준비한다", "회의 메모를 확인한다"]],
  ])
  assert.deepEqual(model.todaySchedule, [
    {
      key: "calendar-event:event-1@2026-08-25",
      title: "회의",
      date: "2026-08-25",
      startTime: "10:00",
      endTime: "11:00",
    },
  ])
})

test("완료된 Calendar task는 active 그룹과 통합 할 일에서 제외한다", () => {
  const model = buildWorkItemsModel(ready(todos), ready(calendar), "2026-08-25")
  assert.equal(model.items.some((item) => item.completed), false)
  assert.equal(model.groups.flatMap((group) => group.items).some((item) => item.title === "완료된 일정 할 일"), false)
})

test("selection source가 authoritative ready일 때만 stale 판정을 허용한다", () => {
  const failed: WorkSourceResult<CalendarResponse> = { status: "error", error: "원장 실패" }
  const loading: WorkSourceResult<TodosResponse> = { status: "loading" }
  assert.equal(isWorkItemSelectionSourceReady("goal:goals/23-work-sibling-views.md#aaaa1111", loading, ready(calendar)), false)
  assert.equal(isWorkItemSelectionSourceReady("calendar:task-1@2026-08-25", ready(todos), failed), false)
  assert.equal(isWorkItemSelectionSourceReady("goal:goals/23-work-sibling-views.md#aaaa1111", ready(todos), failed), true)
  assert.equal(isWorkItemSelectionSourceReady("calendar:task-1@2026-08-25", loading, ready(calendar)), true)
})

test("부분 실패 matrix는 살아 있는 source를 유지하고 모두 실패할 때만 error다", () => {
  const failed: WorkSourceResult<never> = { status: "error", error: "원장 실패" }
  const loading: WorkSourceResult<never> = { status: "loading" }

  const partial = buildWorkItemsModel(ready(todos), failed, "2026-08-25")
  assert.equal(partial.state, "partial")
  assert.equal(partial.items.length, 3)
  assert.deepEqual(partial.todaySchedule, [])
  assert.deepEqual(partial.errors, ["Calendar: 원장 실패"])

  assert.equal(buildWorkItemsModel(failed, failed, "2026-08-25").state, "error")
  assert.equal(buildWorkItemsModel(loading, loading, "2026-08-25").state, "loading")
  assert.equal(buildWorkItemsModel(ready({ ...todos, todos: [], total: 0 }), ready({ ...calendar, occurrences: [] }), "2026-08-25").state, "empty")
})

test("완료 PATCH는 Calendar task에만 만들어지고 Goal·문서에는 없다", () => {
  const model = buildWorkItemsModel(ready(todos), ready(calendar), "2026-08-25")
  const goal = model.items.find((item) => item.source === "goal")!
  const task = model.items.find((item) => item.source === "calendar" && !item.completed)!

  assert.equal(buildCalendarCompletionRequest(goal), null)
  assert.deepEqual(buildCalendarCompletionRequest(task), {
    action: "set_task_completion",
    id: "task-1",
    occurrenceDate: "2026-08-25",
    done: true,
  })
})
