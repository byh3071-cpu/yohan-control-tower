#!/usr/bin/env node

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
  console.log(`[goal 7] ${label}: ${condition ? "✓" : "✗"}`)
  if (!condition) pass = false
}
const must = (condition, label) => {
  console.log(`${condition ? "    ✓" : "    ✗"} ${label}`)
  if (!condition) pass = false
}

if (existsSync(".vhk/HARD_STOP")) {
  console.log("🛑 .vhk/HARD_STOP detected — refusing to run goal 7 gate.")
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

const view = read("src/components/calendar-view.tsx")
const goal = read("goals/7-calendar-trash-ui.md")
must(view?.includes("DeleteCalendarDialog") && view?.includes("deleteCandidate"), "삭제 확인 Dialog 존재")
must(view?.includes("반복 전체") && view?.includes('method: "DELETE"'), "반복 범위 안내와 DELETE 연결")
must(view?.includes("TrashCalendarDialog") && view?.includes("restoreTrashItem"), "휴지통 목록과 복구 UI 존재")
must(view?.includes("되돌리기") && view?.includes("lastTrashed"), "즉시 복구 동작 존재")
must(goal !== null && !goal.includes("- [ ]"), "Goal 7 Completion Check 전부 완료")

if (pass) {
  console.log("✅ goal 7 contract gate passes")
  process.exit(0)
}
console.log("❌ goal 7 contract gate failed")
process.exit(1)
