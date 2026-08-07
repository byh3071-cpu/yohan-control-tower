#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

let pass = true
const read = (path) => existsSync(path) ? readFileSync(path, "utf8") : null
const run = (command, args, options = {}) => {
  try {
    return execFileSync(command, args, { stdio: ["pipe", "pipe", "pipe"], encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options })
  } catch (error) {
    const output = `${error?.stdout?.toString() ?? ""}${error?.stderr?.toString() ?? ""}`
    if (output.trim()) console.log(output.split("\n").slice(-25).join("\n"))
    return null
  }
}
const gate = (label, condition) => {
  console.log(`[goal 9] ${label}: ${condition ? "✓" : "✗"}`)
  if (!condition) pass = false
}
const must = (condition, label) => {
  console.log(`${condition ? "    ✓" : "    ✗"} ${label}`)
  if (!condition) pass = false
}

if (existsSync(".vhk/HARD_STOP")) {
  console.log("🛑 .vhk/HARD_STOP detected — refusing to run goal 9 gate.")
  process.exit(1)
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const scripts = pkg.scripts ?? {}
const packageManager = existsSync("pnpm-lock.yaml") ? "pnpm" : existsSync("yarn.lock") ? "yarn" : "npm"
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === "1"
if (scripts.typecheck) gate("typecheck", run(packageManager, ["run", "typecheck"]) !== null)
if (scripts.lint) gate("lint", run(packageManager, ["run", "lint"]) !== null)
if (!skipDeep) {
  if (scripts.test) gate("test", run(packageManager, ["run", "test"]) !== null)
  if (scripts.build) gate("build", run(packageManager, ["run", "build"]) !== null)
}

const rules = read("RULES.md")
const agents = read("AGENTS.md")
const readme = read("README.md")
const setup = read("scripts/check-local-setup.mjs")
const wrapper = read("scripts/run-vhk.mjs")
const goal = read("goals/9-vhk-session-continuity.md")
must(pkg.devDependencies?.["@byh3071/vhk"] === "2.12.0", "VHK 2.12.0 정확히 고정")
must(pkg.scripts?.vhk === "node scripts/run-vhk.mjs" && pkg.scripts?.["setup:check"] === "node scripts/check-local-setup.mjs", "로컬 VHK·환경 점검 npm 명령")
must(rules?.includes("Phase → Goal → Completion Check") && rules?.includes("active Goal은 항상 하나"), "Phase·Goal·원자적 Check 분해 규칙")
must(rules?.includes("VHK upstream 이슈 등록 기준") && rules?.includes("open·closed 이슈를 중복 검색"), "VHK 결함 분류·중복 검색 규칙")
must(rules?.includes("#555") && rules?.includes("VHK 관리 현재 스냅샷"), "next-task 예외와 upstream 이슈 연결")
must(agents?.includes("새 세션 시작") && agents?.includes("Phase → Goal → Completion Check"), "vhk sync 파생 규칙에 새 세션 프로토콜 전파")
must(readme?.includes("npm run setup:check") && readme?.includes("npm run vhk -- goal peek"), "README 새 PC·새 세션 명령")
must(setup?.includes("값 비표시") && !setup?.includes("console.log(brainRoot)"), "환경 점검이 비밀·경로 값을 출력하지 않음")
must(wrapper?.includes("VHK_RULES_FILE") && wrapper?.includes("issues/556") && wrapper?.includes("규칙 동기화 중단"), "CORE-RULES 원본 자동 연결·안전 차단")

const tempRoot = mkdtempSync(join(tmpdir(), "yohan-goal9-"))
try {
  const brain = join(tempRoot, "brain")
  const repos = join(tempRoot, "repos")
  const calendar = join(tempRoot, "calendar")
  mkdirSync(join(brain, "memory", "core"), { recursive: true })
  writeFileSync(join(brain, "memory", "core", "core-ruleset.yaml"), "version: test\n")
  mkdirSync(repos, { recursive: true })
  const setupOutput = run(process.execPath, ["scripts/check-local-setup.mjs"], {
    env: { ...process.env, YOHAN_OS_ROOT: brain, YOHAN_REPOS_ROOT: repos, YOHAN_CALENDAR_ROOT: calendar, NOTION_TOKEN: "" },
  })
  must(setupOutput?.includes("로컬 핵심 준비 완료") && !setupOutput.includes(tempRoot), "환경 점검 성공·개인 경로 비노출")
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}

must(goal !== null && !goal.includes("- [ ]"), "Goal 9 Completion Check 전부 완료")

if (pass) {
  console.log("✅ goal 9 contract gate passes")
  process.exit(0)
}
console.log("❌ goal 9 contract gate failed")
process.exit(1)
