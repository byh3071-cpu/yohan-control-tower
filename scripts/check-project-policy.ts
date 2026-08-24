#!/usr/bin/env node

import { inspectProjectPolicy } from "../src/lib/project-policy.js"

async function main() {
  const violations = await inspectProjectPolicy()
  console.log("\n🧭 프로젝트 전용 정책 점검")
  if (violations.length === 0) {
    console.log("  ✅ 명시적 any · 절대경로 · 파일명 정책 통과")
    return
  }
  for (const violation of violations) {
    const location = violation.line ? `${violation.file}:${violation.line}${violation.column ? `:${violation.column}` : ""}` : violation.file
    console.error(`  ✖ [${violation.kind}] ${location} — ${violation.message}`)
  }
  throw new Error(`프로젝트 전용 정책 위반 ${violations.length}건`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "프로젝트 전용 정책 점검에 실패했습니다.")
  process.exitCode = 1
})
