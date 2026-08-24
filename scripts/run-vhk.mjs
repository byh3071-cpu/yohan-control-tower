#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import nextEnv from "@next/env"

const { loadEnvConfig } = nextEnv

export function allGoalsDone(projectRoot = process.cwd()) {
  const goalsDir = join(projectRoot, "goals")
  if (!existsSync(goalsDir)) return false
  const goalFiles = readdirSync(goalsDir).filter((name) => /^\d+-.*\.md$/.test(name))
  return goalFiles.length > 0 && goalFiles.every((name) => /^status:\s*DONE\s*$/m.test(readFileSync(join(goalsDir, name), "utf8")))
}

export function writeAllDoneSnapshot(projectRoot = process.cwd(), now = new Date()) {
  const nextTaskPath = join(projectRoot, "docs", "state", "next-task.md")
  if (!existsSync(nextTaskPath)) return false
  const current = readFileSync(nextTaskPath, "utf8")
  if (!current.includes("via `vhk goal next`")) return false
  writeFileSync(nextTaskPath, [
    "# Next Task",
    "",
    `_Auto-updated ${now.toISOString()} via \`vhk goal next\` + project workaround for VHK #558._`,
    "",
    "```",
    "TASK: 없음 — 모든 Goal 완료",
    "  status: DONE",
    "```",
    "",
  ].join("\n"))
  return true
}

function runVhk() {
  loadEnvConfig(process.cwd())

  const args = process.argv.slice(2)
  const brainRoot = process.env.YOHAN_OS_ROOT?.trim()
  const configuredCandidate = brainRoot ? join(brainRoot, "memory", "core", "core-ruleset.yaml") : null
  if (!process.env.VHK_RULES_FILE && configuredCandidate && existsSync(configuredCandidate)) {
    process.env.VHK_RULES_FILE = configuredCandidate
  }

  const coreRulesPath = join(process.cwd(), ".agents", "CORE-RULES.md")
  const existingCoreRules = existsSync(coreRulesPath) ? readFileSync(coreRulesPath, "utf8") : ""
  const needsConfiguredSource = existingCoreRules.includes("generated from configured rules file")
  const updatesCoreRules = args[0] === "sync" || args[0] === "inject-bootstrap"
  const selectsNextGoal = args[0] === "goal" && args[1] === "next"
  const checksProjectRules = args[0] === "check"

  if (updatesCoreRules && needsConfiguredSource && !process.env.VHK_RULES_FILE) {
    console.error("VHK 규칙 동기화 중단 — 설정된 CORE-RULES 원본을 찾지 못했습니다.")
    console.error(".env.local의 YOHAN_OS_ROOT와 memory/core/core-ruleset.yaml을 확인하세요. 기존 CORE-RULES는 보존했습니다.")
    console.error("추적: https://github.com/byh3071-cpu/vhk/issues/556")
    process.exit(1)
  }

  const cliPath = join(process.cwd(), "node_modules", "@byh3071", "vhk", "dist", "index.js")
  if (!existsSync(cliPath)) {
    console.error("프로젝트 고정 VHK를 찾지 못했습니다. npm install을 먼저 실행하세요.")
    process.exit(1)
  }

  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  })

  if (result.error) {
    console.error(`VHK 실행 실패: ${result.error.message}`)
    process.exit(1)
  }

  const vhkExitCode = result.status ?? 1
  let projectPolicyExitCode = 0
  if (checksProjectRules) {
    const policyScript = join(process.cwd(), "scripts", "check-project-policy.ts")
    const policyResult = spawnSync(process.execPath, ["--import", "tsx", policyScript], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    })
    if (policyResult.error) {
      console.error(`프로젝트 전용 정책 점검 실패: ${policyResult.error.message}`)
      projectPolicyExitCode = 1
    } else {
      projectPolicyExitCode = policyResult.status ?? 1
    }
  }
  const exitCode = vhkExitCode !== 0 ? vhkExitCode : projectPolicyExitCode
  if (exitCode === 0 && selectsNextGoal && allGoalsDone()) {
    if (writeAllDoneSnapshot()) console.log("  ✅ next-task.md 전체 완료 snapshot 보정 — VHK #558")
    else console.warn("  ⚠️ 수동 작성 next-task.md는 보정하지 않았습니다 — VHK #558")
  }

  process.exit(exitCode)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runVhk()
