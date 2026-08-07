#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

let pass = true
const read = (path) => existsSync(path) ? readFileSync(path, "utf8") : null
const must = (condition, label) => {
  console.log(`${condition ? "    ✓" : "    ✗"} ${label}`)
  if (!condition) pass = false
}
const run = (command, args) => {
  try {
    execFileSync(command, args, { stdio: ["pipe", "pipe", "pipe"], encoding: "utf8" })
    return true
  } catch {
    return false
  }
}

if (existsSync(".vhk/HARD_STOP")) {
  console.log("🛑 .vhk/HARD_STOP detected — refusing to run goal 12 gate.")
  process.exit(1)
}

const files = ["RULES.md", "AGENTS.md", "CLAUDE.md"]
for (const path of files) {
  const content = read(path)
  must(
    content?.includes("GitHub Issue·PR·VHK Goal·Task·세션 인수인계 문서는 **한국어를 기본 언어**") ?? false,
    `${path} 사용자용 문서 한국어 기본 원칙`,
  )
  must(
    content?.includes("명령어·코드·필드명·고유명사는 원문 영어를 유지") ?? false,
    `${path} 기술 식별자 예외`,
  )
}

const goal = read("goals/12-korean-user-facing-artifacts.md")
must(goal !== null && !goal.includes("- [ ]"), "Goal 12 Completion Check 전부 완료")
must([555, 556, 557, 558].every((id) => goal?.includes(`/issues/${id}`)), "한국어로 갱신한 VHK 이슈 4건 링크")
must(run("git", ["diff", "--check"]), "git diff --check")

if (pass) {
  console.log("✅ goal 12 contract gate passes")
  process.exit(0)
}
console.log("❌ goal 12 contract gate failed")
process.exit(1)
