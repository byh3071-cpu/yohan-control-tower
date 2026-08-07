#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

let pass = true
const read = (path) => existsSync(path) ? readFileSync(path, "utf8") : null
const run = (command, args, options = {}) => {
  try {
    execFileSync(command, args, { stdio: ["pipe", "pipe", "pipe"], encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options })
    return true
  } catch (error) {
    const output = `${error?.stdout?.toString() ?? ""}${error?.stderr?.toString() ?? ""}`
    if (output.trim()) console.log(output.split("\n").slice(-25).join("\n"))
    return false
  }
}
const gate = (label, condition) => {
  console.log(`[goal 10] ${label}: ${condition ? "✓" : "✗"}`)
  if (!condition) pass = false
}
const must = (condition, label) => {
  console.log(`${condition ? "    ✓" : "    ✗"} ${label}`)
  if (!condition) pass = false
}

if (existsSync(".vhk/HARD_STOP")) {
  console.log("🛑 .vhk/HARD_STOP detected — refusing to run goal 10 gate.")
  process.exit(1)
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const scripts = pkg.scripts ?? {}
const packageManager = existsSync("pnpm-lock.yaml") ? "pnpm" : existsSync("yarn.lock") ? "yarn" : "npm"
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === "1"
if (scripts.typecheck) gate("typecheck", run(packageManager, ["run", "typecheck"]))
if (scripts.lint) gate("lint", run(packageManager, ["run", "lint"]))
if (scripts.scan) gate("secure scan", run(packageManager, ["run", "scan"]))
const docsRoot = mkdtempSync(join(tmpdir(), "yohan-goal10-brain-"))
try {
  mkdirSync(join(docsRoot, "memory"), { recursive: true })
  gate("verify:docs", run(packageManager, ["run", "verify:docs"], { env: { ...process.env, YOHAN_OS_ROOT: docsRoot } }))
} finally {
  rmSync(docsRoot, { recursive: true, force: true })
}
if (!skipDeep) {
  if (scripts.test) gate("test", run(packageManager, ["run", "test"]))
  if (scripts.build) gate("build", run(packageManager, ["run", "build"]))
}

const prd = read("docs/PRD.md")
const architecture = read("docs/ARCHITECTURE.md")
const adr = read("docs/adr/ADR-002-local-calendar-markdown-store.md")
const audit = read("docs/ECOSYSTEM-CONTRACT-AUDIT.md")
const log = read("docs/log/2026-08-07-calendar-daily-use-mvp.md")
const goal = read("goals/10-calendar-daily-use-release.md")
must(prd?.includes("안전 수정·휴지통·복구") && prd?.includes("모바일 선택일 우선"), "PRD F011 일상 사용 기능")
must(architecture?.includes("YOHAN_CALENDAR_ROOT/trash/*.md") && architecture?.includes("expectedUpdatedAt"), "Architecture 저장·충돌 경계")
must(adr?.includes("rename") && adr?.includes("영구 삭제"), "ADR-002 휴지통 결정")
must(audit?.includes("Goal 5~10") && audit?.includes("VHK #555") && audit?.includes("VHK #556") && audit?.includes("VHK #557"), "생태계 감사 최신 판정")
must(log?.includes("47/47") && log?.includes("Playwright") && log?.includes("#555") && log?.includes("#556") && log?.includes("#557"), "세션 로그 검증·VHK 이슈")
must([5, 6, 7, 8, 9].every((id) => read(`goals/${id}-${["calendar-item-editing", "calendar-trash-contract", "calendar-trash-ui", "calendar-mobile-agenda-first", "vhk-session-continuity"][id - 5]}.md`)?.includes("status: DONE")), "Goal 5~9 DONE")
must(goal !== null && !goal.includes("- [ ]"), "Goal 10 Completion Check 전부 완료")

if (pass) {
  console.log("✅ goal 10 contract gate passes")
  process.exit(0)
}
console.log("❌ goal 10 contract gate failed")
process.exit(1)
