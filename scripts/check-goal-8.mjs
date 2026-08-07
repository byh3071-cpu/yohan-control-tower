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
  console.log(`[goal 8] ${label}: ${condition ? "✓" : "✗"}`)
  if (!condition) pass = false
}
const must = (condition, label) => {
  console.log(`${condition ? "    ✓" : "    ✗"} ${label}`)
  if (!condition) pass = false
}

if (existsSync(".vhk/HARD_STOP")) {
  console.log("🛑 .vhk/HARD_STOP detected — refusing to run goal 8 gate.")
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
const goal = read("goals/8-calendar-mobile-agenda-first.md")
must(view?.includes('aria-label="선택한 날짜 일정"'), "선택일 패널 접근성 이름 존재")
must(view?.includes('className="order-1 lg:order-2"'), "모바일 선택일 패널 선행·데스크톱 우측 배치")
must(view?.includes('className="order-2 overflow-hidden') && view?.includes("lg:order-1"), "모바일 월간 격자 후행·데스크톱 좌측 배치")
must(view?.includes("min-h-32") && view?.includes("sm:min-h-52"), "모바일 빈 상태 높이 축소")
must(goal !== null && !goal.includes("- [ ]"), "Goal 8 Completion Check 전부 완료")

if (pass) {
  console.log("✅ goal 8 contract gate passes")
  process.exit(0)
}
console.log("❌ goal 8 contract gate failed")
process.exit(1)
