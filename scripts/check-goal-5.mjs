#!/usr/bin/env node
// Goal 5 고유 계약 게이트. 기본 품질 게이트는 완료 전에 별도로 실행한다.

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

let pass = true
const read = (path) => existsSync(path) ? readFileSync(path, "utf8") : null
const run = (command, args) => {
  try {
    execFileSync(command, args, { stdio: ["pipe", "pipe", "pipe"], encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    return true
  } catch (error) {
    const output = `${error?.stdout?.toString() ?? ""}${error?.stderr?.toString() ?? ""}`
    if (output.trim()) console.log(output.split("\n").slice(-25).join("\n"))
    return false
  }
}
const gate = (label, condition) => {
  console.log(`[goal 5] ${label}: ${condition ? "✓" : "✗"}`)
  if (!condition) pass = false
}
const must = (condition, label) => {
  console.log(`${condition ? "    ✓" : "    ✗"} ${label}`)
  if (!condition) pass = false
}

if (existsSync(".vhk/HARD_STOP")) {
  console.log("🛑 .vhk/HARD_STOP detected — refusing to run goal 5 gate.")
  process.exit(1)
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const scripts = pkg.scripts ?? {}
const packageManager = existsSync("pnpm-lock.yaml") ? "pnpm" : existsSync("yarn.lock") ? "yarn" : "npm"
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === "1"
if (scripts.typecheck) gate("typecheck", run(packageManager, ["run", "typecheck"]))
if (scripts.lint) gate("lint", run(packageManager, ["run", "lint"]))
if (!skipDeep) {
  if (scripts.test) gate("test", run(packageManager, ["run", "test"]))
  if (scripts.build) gate("build", run(packageManager, ["run", "build"]))
}

const calendar = read("src/lib/calendar.ts")
const api = read("src/app/api/calendar/route.ts")
const view = read("src/components/calendar-view.tsx")
const tests = read("src/lib/calendar.test.ts")
const goal = read("goals/5-calendar-item-editing.md")

must(calendar?.includes("updateCalendarItem"), "Calendar 원본 수정 함수 존재")
must(calendar?.includes("CalendarConflictError") && calendar?.includes("expectedUpdatedAt"), "외부 변경 충돌 거부")
must(api?.includes('body.action === "update_item"'), "PATCH update_item API 존재")
must(view?.includes("openEdit") && view?.includes("반복 전체 수정"), "수정 UI와 반복 전체 범위 안내")
must(tests?.includes("외부에서 먼저 바뀐") && tests?.includes("반복 규칙 수정"), "수정·충돌·완료 기록 테스트 존재")
must(goal !== null && !goal.includes("- [ ]"), "Goal 5 Completion Check 전부 완료")

if (pass) {
  console.log("✅ goal 5 contract gate passes")
  process.exit(0)
}
console.log("❌ goal 5 contract gate failed")
process.exit(1)
