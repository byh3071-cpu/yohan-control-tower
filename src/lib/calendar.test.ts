import assert from "node:assert/strict"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import test from "node:test"

import {
  CalendarInputError,
  createCalendarItem,
  expandCalendarItems,
  listCalendarRange,
  setCalendarTaskCompletion,
} from "./calendar"
import type { CalendarItem } from "./types"

const roots: string[] = []

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "yohan-calendar-test-"))
  roots.push(root)
  return root
}

test.afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

function item(overrides: Partial<CalendarItem> = {}): CalendarItem {
  return {
    id: "cal_00000000-0000-4000-8000-000000000001",
    kind: "event",
    title: "기본 일정",
    date: "2026-08-07",
    startTime: "10:00",
    endTime: "11:00",
    status: "open",
    recurrence: "none",
    recurrenceInterval: 1,
    recurrenceUntil: null,
    completedDates: [],
    notes: "",
    createdAt: "2026-08-07T00:00:00.000Z",
    updatedAt: "2026-08-07T00:00:00.000Z",
    ...overrides,
  }
}

test("일정과 할 일을 항목별 Markdown으로 만들고 시간순으로 읽는다", async () => {
  const root = await tempRoot()
  const task = await createCalendarItem({ kind: "task", title: "월간 정산", date: "2026-08-07" }, root)
  const event = await createCalendarItem({
    kind: "event",
    title: "제품 리뷰",
    date: "2026-08-07",
    startTime: "09:30",
    endTime: "10:00",
    notes: "MVP 판단",
  }, root)

  const result = await listCalendarRange("2026-08-07", "2026-08-07", root)
  assert.equal(result.sourceItems, 2)
  assert.deepEqual(result.issues, [])
  assert.deepEqual(result.occurrences.map((entry) => entry.sourceId), [event.id, task.id])
  assert.equal(result.occurrences[0].kind, "event")
  assert.equal(result.occurrences[1].kind, "task")
})

test("daily·weekly·monthly 반복을 확장하고 월말에 존재하지 않는 날짜는 만들지 않는다", () => {
  const occurrences = expandCalendarItems([
    item({ recurrence: "daily", recurrenceInterval: 2, recurrenceUntil: "2026-08-11" }),
    item({
      id: "cal_00000000-0000-4000-8000-000000000002",
      title: "주간 회고",
      recurrence: "weekly",
      recurrenceInterval: 1,
      recurrenceUntil: "2026-08-21",
    }),
    item({
      id: "cal_00000000-0000-4000-8000-000000000003",
      title: "월말 결산",
      date: "2026-01-31",
      recurrence: "monthly",
      recurrenceInterval: 1,
      recurrenceUntil: "2026-03-31",
    }),
  ], "2026-01-31", "2026-08-21")

  const daily = occurrences.filter((entry) => entry.title === "기본 일정").map((entry) => entry.date)
  const weekly = occurrences.filter((entry) => entry.title === "주간 회고").map((entry) => entry.date)
  const monthly = occurrences.filter((entry) => entry.title === "월말 결산").map((entry) => entry.date)
  assert.deepEqual(daily, ["2026-08-07", "2026-08-09", "2026-08-11"])
  assert.deepEqual(weekly, ["2026-08-07", "2026-08-14", "2026-08-21"])
  assert.deepEqual(monthly, ["2026-01-31", "2026-03-31"])
})

test("반복 할 일은 선택한 발생일만 완료하고 다시 열 수 있다", async () => {
  const root = await tempRoot()
  const recurring = await createCalendarItem({
    kind: "task",
    title: "매일 피아노 20분",
    date: "2026-08-07",
    recurrence: "daily",
    recurrenceUntil: "2026-08-09",
  }, root)

  await setCalendarTaskCompletion(recurring.id, "2026-08-08", true, root)
  let result = await listCalendarRange("2026-08-07", "2026-08-09", root)
  assert.deepEqual(result.occurrences.map((entry) => entry.status), ["open", "done", "open"])

  await setCalendarTaskCompletion(recurring.id, "2026-08-08", false, root)
  result = await listCalendarRange("2026-08-07", "2026-08-09", root)
  assert.deepEqual(result.occurrences.map((entry) => entry.status), ["open", "open", "open"])
})

test("손상 파일은 빈 목록으로 숨기지 않고 issue로 보고한다", async () => {
  const root = await tempRoot()
  const itemsDir = join(root, "items")
  await mkdir(itemsDir, { recursive: true })
  await writeFile(join(itemsDir, "broken.md"), "---\ncalendar_format: 99\n---\n", "utf8")

  const result = await listCalendarRange("2026-08-07", "2026-08-07", root)
  assert.equal(result.sourceItems, 0)
  assert.equal(result.issues.length, 1)
  assert.equal(result.issues[0].file, "broken.md")
})

test("잘못된 날짜·시간·범위·발생일 완료를 거부한다", async () => {
  const root = await tempRoot()
  await assert.rejects(
    createCalendarItem({ kind: "event", title: "역전", date: "2026-02-30" }, root),
    CalendarInputError
  )
  await assert.rejects(
    createCalendarItem({ kind: "event", title: "역전", date: "2026-08-07", startTime: "11:00", endTime: "10:00" }, root),
    /종료 시간은 시작 시간보다 뒤/
  )
  assert.throws(() => expandCalendarItems([], "2026-08-08", "2026-08-07"), /to는 from보다 빠를 수 없습니다/)

  const task = await createCalendarItem({ kind: "task", title: "금요일만", date: "2026-08-07", recurrence: "weekly" }, root)
  await assert.rejects(setCalendarTaskCompletion(task.id, "2026-08-08", true, root), /발생일이 아닙니다/)
})
