#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { allGoalsDone, writeAllDoneSnapshot } from "./run-vhk.mjs"

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
  console.log(`[goal 11] ${label}: ${condition ? "✓" : "✗"}`)
  if (!condition) pass = false
}
const must = (condition, label) => {
  console.log(`${condition ? "    ✓" : "    ✗"} ${label}`)
  if (!condition) pass = false
}

if (existsSync(".vhk/HARD_STOP")) {
  console.log("🛑 .vhk/HARD_STOP detected — refusing to run goal 11 gate.")
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

const wrapper = read("scripts/run-vhk.mjs")
const rules = read("RULES.md")
const log = read("docs/log/2026-08-07-calendar-daily-use-mvp.md")
const goal = read("goals/11-vhk-all-done-handoff.md")
must(wrapper?.includes("allGoalsDone") && wrapper?.includes("writeAllDoneSnapshot"), "전체 Goal DONE 판정·snapshot 함수")
must(wrapper?.includes('includes("via `vhk goal next`")'), "VHK 관리 snapshot만 보정")
must(wrapper?.includes("TASK: 없음 — 모든 Goal 완료") && wrapper?.includes("status: DONE"), "명시적인 전체 완료 상태")
must(rules?.includes("#558") && rules?.includes("전체 완료 snapshot"), "RULES all-done workaround")
must(log?.includes("#558") && log?.includes("완료 snapshot"), "세션 로그 VHK #558")

const fixture = mkdtempSync(join(tmpdir(), "yohan-goal11-"))
try {
  mkdirSync(join(fixture, "goals"), { recursive: true })
  mkdirSync(join(fixture, "docs", "state"), { recursive: true })
  writeFileSync(join(fixture, "goals", "1-done.md"), "---\ntype: goal\nid: 1\nstatus: DONE\n---\n")
  const nextTask = join(fixture, "docs", "state", "next-task.md")
  writeFileSync(nextTask, "# Next Task\n\n_Auto-updated via `vhk goal next`._\n\n```\nstatus: IN_PROGRESS\n```\n")
  const corrected = allGoalsDone(fixture) && writeAllDoneSnapshot(fixture, new Date("2026-08-07T00:00:00.000Z"))
  const correctedText = readFileSync(nextTask, "utf8")
  must(corrected && correctedText.includes("TASK: 없음 — 모든 Goal 완료") && correctedText.includes("status: DONE"), "격리 fixture 전체 완료 snapshot 보정")

  writeFileSync(nextTask, "# 사람이 직접 쓴 다음 작업\n")
  const manualPreserved = !writeAllDoneSnapshot(fixture) && readFileSync(nextTask, "utf8") === "# 사람이 직접 쓴 다음 작업\n"
  must(manualPreserved, "수동 작성 next-task 보존")
} finally {
  rmSync(fixture, { recursive: true, force: true })
}

must(goal !== null && !goal.includes("- [ ]"), "Goal 11 Completion Check 전부 완료")

if (pass) {
  console.log("✅ goal 11 contract gate passes")
  process.exit(0)
}
console.log("❌ goal 11 contract gate failed")
process.exit(1)
