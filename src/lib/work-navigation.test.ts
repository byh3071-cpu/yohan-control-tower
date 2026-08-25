import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  canonicalizeWorkSearch,
  parseWorkSearch,
  resolveCalendarViewState,
  resolveTopViewAction,
  seoulDate,
  serializeWorkLocation,
  type WorkLocation,
} from "@/lib/work-navigation"

test("활성 작업 탭 재클릭은 no-op이고 다른 탭에서만 work history를 추가한다", () => {
  assert.equal(resolveTopViewAction("projects", "projects"), "no-op")
  assert.equal(resolveTopViewAction("home", "projects"), "navigate-work")
  assert.equal(resolveTopViewAction("projects", "docs"), "leave-work")
})

test("상위 탭 handler가 no-op 판정을 navigateWork보다 먼저 적용한다", () => {
  const page = readFileSync("src/app/page.tsx", "utf8")
  assert.match(page, /const action = resolveTopViewAction\(activeView, tab\)/)
  assert.match(page, /if \(action === "no-op"\) return\s+if \(action === "navigate-work"\) \{\s+navigateWork\(workLocation\)/)
})

test("query가 없으면 NOW를 유지하고 work query만 canonicalize한다", () => {
  assert.deepEqual(parseWorkSearch(""), { kind: "now" })
  assert.equal(serializeWorkLocation({ kind: "now" }), "")

  assert.equal(
    canonicalizeWorkSearch("?project=control-tower&surface=projects&view=work&debug=secret"),
    "?view=work&surface=projects&project=control-tower",
  )
})

test("Calendar URL optional state 제거는 날짜와 mode를 각각 canonical default로 되돌린다", () => {
  const today = "2026-08-25"
  assert.deepEqual(resolveCalendarViewState("2026-10-20", "list", today), {
    selectedDate: "2026-10-20",
    month: "2026-10",
    mode: "list",
  })
  assert.deepEqual(resolveCalendarViewState(undefined, undefined, today), {
    selectedDate: today,
    month: "2026-08",
    mode: "month",
  })
  assert.deepEqual(resolveCalendarViewState(undefined, "list", today), {
    selectedDate: today,
    month: "2026-08",
    mode: "list",
  })
  assert.deepEqual(resolveCalendarViewState("2026-10-20", undefined, today), {
    selectedDate: "2026-10-20",
    month: "2026-10",
    mode: "month",
  })
})

test("주입한 clock은 KST 자정 경계에서 새 서울 날짜로 전환한다", () => {
  assert.equal(seoulDate(new Date("2026-08-25T14:59:59.999Z")), "2026-08-25")
  assert.equal(seoulDate(new Date("2026-08-25T15:00:00.000Z")), "2026-08-26")
})

test("surface와 날짜·mode·선택값은 allowlist와 형식에 맞게 정규화한다", () => {
  assert.deepEqual(
    parseWorkSearch("?view=work&surface=calendar&date=2026-8-2&mode=list&item=calendar%3Atask-42%402026-08-02"),
    {
      kind: "work",
      surface: "calendar",
      date: "2026-08-02",
      mode: "list",
      item: "calendar:task-42@2026-08-02",
    },
  )

  assert.deepEqual(
    parseWorkSearch("?view=work&surface=unknown&date=../../auth.json&mode=week&item=C:%5Csecret"),
    { kind: "work", surface: "todo" },
  )
})

test("refresh와 back-forward에서 직렬화한 각 entry가 같은 상태로 복원된다", () => {
  const productionGoalKey = "goal:yohan-control-tower/goals/23-work-sibling-views.md#a1b2c3d4"
  const history: WorkLocation[] = [
    { kind: "now" },
    { kind: "work", surface: "todo", item: productionGoalKey },
    { kind: "work", surface: "calendar", date: "2026-08-25", mode: "month" },
    { kind: "work", surface: "projects", mission: "work", project: "yohan-control-tower" },
  ]

  for (const location of history) {
    assert.deepEqual(parseWorkSearch(serializeWorkLocation(location)), location)
  }
  assert.deepEqual(parseWorkSearch(serializeWorkLocation(history[1])), history[1])
  assert.deepEqual(parseWorkSearch(serializeWorkLocation(history[2])), history[2])
})

test("production-shaped Goal·문서 item key와 한글·공백 상대경로를 안전하게 round-trip한다", () => {
  for (const item of [
    "goal:yohan-control-tower/goals/23-work-sibling-views.md#a1b2c3d4",
    "doc:memory/decisions/work-screen.md#e5f6a7b8",
    "doc:memory/decisions/한글 문서.md#e5f6a7b8",
    "calendar:task-1@2026-08-25",
  ]) {
    const location: WorkLocation = { kind: "work", surface: "todo", item }
    const serialized = serializeWorkLocation(location)
    assert.match(serialized, /item=/)
    assert.deepEqual(parseWorkSearch(serialized), location)
  }
})

test("item key는 절대경로·drive prefix·leading slash·역슬래시·control·traversal을 거절한다", () => {
  const unsafeItems = [
    "goal:C:/Users/private/secret.md#deadbeef",
    "goal:C:Users/private/secret.md#deadbeef",
    "goal:C:\\Users\\private\\secret.md#deadbeef",
    "doc:/home/private/secret.md#deadbeef",
    "goal:goals/../secret.md#deadbeef",
    "goal:goals/./secret.md#deadbeef",
    "goal:goals//secret.md#deadbeef",
    "goal:goals/secret.md#dead\u0000beef",
  ]

  for (const item of unsafeItems) {
    const serialized = serializeWorkLocation({ kind: "work", surface: "todo", item })
    assert.equal(serialized, "?view=work&surface=todo")
    assert.deepEqual(parseWorkSearch(`?view=work&surface=todo&item=${encodeURIComponent(item)}`), {
      kind: "work",
      surface: "todo",
    })
    assert.doesNotMatch(serialized, /Users|home|secret/)
  }
})

test("Calendar surface는 Calendar source item만 허용하고 source-surface mismatch를 제거한다", () => {
  for (const item of [
    "goal:yohan-control-tower/goals/23-work-sibling-views.md#a1b2c3d4",
    "doc:memory/decisions/한글 문서.md#e5f6a7b8",
  ]) {
    assert.deepEqual(
      parseWorkSearch(`?view=work&surface=calendar&date=2026-08-25&item=${encodeURIComponent(item)}`),
      { kind: "work", surface: "calendar", date: "2026-08-25" },
    )
    assert.equal(
      serializeWorkLocation({ kind: "work", surface: "calendar", date: "2026-08-25", item }),
      "?view=work&surface=calendar&date=2026-08-25",
    )
  }
})

test("자동 selection canonicalization은 replace 배선을 사용한다", () => {
  const workView = readFileSync("src/components/work-view.tsx", "utf8")
  const todoView = readFileSync("src/components/todo-view.tsx", "utf8")
  const projectView = readFileSync("src/components/project-view.tsx", "utf8")
  const calendarView = readFileSync("src/components/calendar-view.tsx", "utf8")

  assert.match(workView, /onSelectedItemChange=\{\(item, replace\)/)
  assert.match(workView, /onSelectionChange=\{\(mission, project, replace\)/)
  assert.match(todoView, /onSelectedItemChange\(null, true\)/)
  assert.match(projectView, /onSelectionChange\(selection\.missionId, null, true\)/)
  assert.match(calendarView, /onLocationChange\?\.\(\{ date: locationDate, mode: locationMode \}, true\)/)
  assert.match(calendarView, /if \(!selectedItemId \|\| loading \|\| !data \|\| error\) return/)
  assert.match(calendarView, /activeRequestRef\.current\?\.controller\.abort\(\)/)
  assert.match(calendarView, /rangeState\.key === rangeKey/)
  assert.match(calendarView, /if \(activeRequestRef\.current\?\.id !== requestId\) return/)
})

test("Calendar URL dialog와 768 Todo·Project modal 회귀 계약을 배선한다", () => {
  const calendarView = readFileSync("src/components/calendar-view.tsx", "utf8")
  const todoView = readFileSync("src/components/todo-view.tsx", "utf8")
  const projectView = readFileSync("src/components/project-view.tsx", "utf8")
  const responsiveDialog = readFileSync("src/components/use-responsive-dialog.ts", "utf8")
  const browserQa = readFileSync("scripts/qa-work-screen.mjs", "utf8")

  assert.match(calendarView, /const editingItemKey = `calendar:\$\{editingItem\.id\}`/)
  assert.match(calendarView, /if \(selectedItemId === editingItemKey\) return/)
  assert.match(calendarView, /finalFocus=\{resolveEditFinalFocus\}/)
  assert.match(calendarView, /if \(trigger\?\.isConnected\) return trigger/)
  assert.match(calendarView, /return fallback\?\.isConnected \? fallback : false/)
  assert.match(calendarView, /data-calendar-focus-fallback/)
  assert.match(todoView, /data-work-dialog-backdrop="todo"/)
  assert.match(todoView, /activeRequestRef\.current\?\.controller\.abort\(\)/)
  assert.match(todoView, /canCommitWorkResponse\(requestId, requestSequenceRef\.current, controller\.signal\.aborted\)/)
  assert.match(projectView, /data-work-dialog-backdrop="projects"/)
  assert.match(responsiveDialog, /!container\.contains\(document\.activeElement\)/)
  assert.match(browserQa, /calendar-cross-month/)
  assert.match(browserQa, /historyLengthBefore/)
  assert.match(browserQa, /backgroundClicks/)
})
