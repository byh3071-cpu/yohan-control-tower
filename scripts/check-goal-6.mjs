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
  console.log(`[goal 6] ${label}: ${condition ? "✓" : "✗"}`)
  if (!condition) pass = false
}
const must = (condition, label) => {
  console.log(`${condition ? "    ✓" : "    ✗"} ${label}`)
  if (!condition) pass = false
}

if (existsSync(".vhk/HARD_STOP")) {
  console.log("🛑 .vhk/HARD_STOP detected — refusing to run goal 6 gate.")
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
const tests = read("src/lib/calendar.test.ts")
const goal = read("goals/6-calendar-trash-contract.md")
must(calendar?.includes("trashCalendarItem") && calendar?.includes("restoreCalendarItem"), "휴지통 이동·복구 함수 존재")
must(calendar?.includes("rename(") && !calendar?.includes("unlink("), "영구 삭제 없이 rename 사용")
must(api?.includes("export async function DELETE") && api?.includes('body.action === "restore_item"'), "DELETE·restore_item API 존재")
must(api?.includes('view === "trash"'), "휴지통 목록 API 존재")
must(tests?.includes("경로 traversal") && tests?.includes("복구 충돌"), "이동·목록·복구·보안 테스트 존재")
must(goal !== null && !goal.includes("- [ ]"), "Goal 6 Completion Check 전부 완료")

if (pass) {
  console.log("✅ goal 6 contract gate passes")
  process.exit(0)
}
console.log("❌ goal 6 contract gate failed")
process.exit(1)
