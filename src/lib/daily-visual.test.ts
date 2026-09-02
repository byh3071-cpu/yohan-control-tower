import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  DAILY_KIND_PILL,
  DAILY_SURFACE,
  DAILY_VISUAL,
  buildQuickAddTaskInput,
  pillColorForKind,
} from "@/lib/daily-visual"

test("일상 표면 토큰 SoT가 시안 hex를 한 모듈에 둔다", () => {
  assert.equal(DAILY_SURFACE, "daily")
  assert.equal(DAILY_VISUAL.bg, "#ffffff")
  assert.equal(DAILY_VISUAL.ink, "#2a2a2a")
  assert.equal(DAILY_VISUAL.muted, "#9a9692")
  assert.equal(DAILY_VISUAL.line, "#eeeae6")
  assert.equal(DAILY_VISUAL.rose, "#f0a3b0")
  assert.equal(DAILY_VISUAL.roseDeep, "#e07a8c")
  assert.equal(DAILY_VISUAL.roseFill, "#fde8ec")
  assert.deepEqual(DAILY_VISUAL.pill, {
    pink: "#f7d5dc",
    blue: "#cfe6f4",
    cyan: "#c8e8ee",
    mint: "#d4eadc",
    lav: "#e3daf3",
    peach: "#f6dfd0",
    sand: "#eee8e0",
    gray: "#ebe8e4",
  })
})

test("pill 색은 kind allowlist만 쓰고 그 외는 sand다", () => {
  assert.equal(pillColorForKind("event"), DAILY_KIND_PILL.event)
  assert.equal(pillColorForKind("task"), DAILY_KIND_PILL.task)
  assert.equal(pillColorForKind("event"), DAILY_VISUAL.pill.cyan)
  assert.equal(pillColorForKind("task"), DAILY_VISUAL.pill.pink)
  assert.equal(pillColorForKind("unknown"), DAILY_VISUAL.pill.sand)
  assert.equal(pillColorForKind(""), DAILY_VISUAL.pill.sand)
})

test("빠른 추가는 선택일과 비어 있지 않은 제목으로 task payload만 만든다", () => {
  assert.deepEqual(buildQuickAddTaskInput("2026-09-27", "  자소서 초안  "), {
    kind: "task",
    title: "자소서 초안",
    date: "2026-09-27",
  })
  assert.equal(buildQuickAddTaskInput("2026-09-27", ""), null)
  assert.equal(buildQuickAddTaskInput("2026-09-27", "   "), null)
})

test("Calendar와 Work 형제는 daily-visual 값만 쓰고 카테고리 점·다가 span을 그리지 않는다", () => {
  const calendarView = readFileSync("src/components/calendar-view.tsx", "utf8")
  const workView = readFileSync("src/components/work-view.tsx", "utf8")
  const globals = readFileSync("src/app/globals.css", "utf8")

  assert.match(calendarView, /from "@\/lib\/daily-visual"/)
  assert.match(calendarView, /buildQuickAddTaskInput/)
  assert.match(calendarView, /pillColorForKind/)
  assert.match(calendarView, /data-surface=\{DAILY_SURFACE\}/)
  assert.match(calendarView, /<h1[\s\S]*\{formatSelectedDate/)
  assert.match(calendarView, /const input = buildQuickAddTaskInput\(selectedDate, quickTitle\)/)
  assert.match(calendarView, /if \(!input\) return/)
  assert.match(calendarView, /action: "set_task_completion"/)
  assert.match(calendarView, /method: "PATCH"/)
  assert.match(calendarView, /method: "POST"/)
  assert.doesNotMatch(calendarView, /\/api\/todos/)
  assert.doesNotMatch(calendarView, /\/api\/goals/)
  assert.doesNotMatch(calendarView, /set_goal_completion|completeGoal|goal_complete/)
  assert.doesNotMatch(calendarView, /개인일정|스마트스토어|이력·지원/)
  assert.doesNotMatch(calendarView, /data-category|category-dot|cats/)
  assert.doesNotMatch(calendarView, /col-span-[2-4]|grid-column:\s*span|className="s[2-4]"/)
  assert.doesNotMatch(calendarView, /#f0a3b0|#f7d5dc|#c8e8ee|#eee8e0|#fde8ec|#e07a8c/)

  assert.match(workView, /from "@\/lib\/daily-visual"/)
  assert.match(workView, /DAILY_VISUAL/)
  assert.match(workView, /"data-surface": DAILY_SURFACE/)
  assert.match(workView, /isDailyCalendar/)
  assert.doesNotMatch(workView, /#f0a3b0|#9a9692|#2a2a2a/)

  assert.match(globals, /\[data-surface="daily"\]/)
  assert.match(globals, /--daily-bg:\s*#ffffff/)
  assert.match(globals, /--daily-rose:\s*#f0a3b0/)
  assert.match(globals, /--daily-pill-cyan:\s*#c8e8ee/)
  assert.match(globals, /--daily-pill-pink:\s*#f7d5dc/)
})
