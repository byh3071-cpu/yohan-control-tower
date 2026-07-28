#!/usr/bin/env node
/**
 * 문서 경로 allowlist 스모크 체크.
 * 실행: npx tsx scripts/verify-doc-paths.ts
 *
 * 유래: yohan-brain `scripts/verify-dashboard-doc-paths.ts` (Goal 1 U4).
 * ADR-012 로 dashboard 가 이 레포로 이관되면서 함께 옮겨왔다 — brain 에 남으면
 * `dashboard/src/lib/*` 를 import 하던 경로가 통째로 깨진다.
 *
 * 전제: `YOHAN_OS_ROOT` 가 brain 루트를 가리켜야 한다(ARCHITECTURE §6-②).
 * 미설정이면 resolveRepoRoot() 가 throw 하므로 이 스크립트도 실패한다 — 의도된 동작이다.
 */

import { existsSync } from "node:fs"
import { join } from "node:path"

import { isDocPathAllowed, DOC_SCAN_PREFIXES, DOC_SOURCES } from "../src/lib/memory"
import { getMemoryDir, resolveRepoRoot } from "../src/lib/paths"

let ok = true

function must(cond: boolean, label: string): void {
  console.log(`  ${cond ? "OK  " : "FAIL"} ${label}`)
  if (!cond) ok = false
}

const memoryDir = getMemoryDir()
must(existsSync(memoryDir), `memory 디렉토리 존재 (${memoryDir})`)
must(existsSync(join(resolveRepoRoot(), "memory")), "resolveRepoRoot 가 memory 를 찾는다")

must(DOC_SOURCES.length >= 10, `DOC_SOURCES 채워짐 (${DOC_SOURCES.length}개)`)
must(DOC_SCAN_PREFIXES.includes("inbox/archive/md_files"), "아카이브 교재 prefix 스캔 대상")

// allowlist 통과해야 하는 경로
must(isDocPathAllowed("wiki/entities/mcp.md"), "wiki 경로 허용")

// allowlist 가 막아야 하는 경로
must(!isDocPathAllowed("inbox/archive/telegram-inbox.md"), "md_files 밖 아카이브 차단")
must(!isDocPathAllowed("../secrets.md"), "경로 traversal 차단")

if (ok) {
  console.log("verify-doc-paths 통과")
  process.exit(0)
}
console.error("verify-doc-paths 실패")
process.exit(1)
