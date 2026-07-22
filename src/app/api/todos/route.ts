import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { resolveRepoRoot } from "@/lib/paths"
import type { TodoItem, TodosResponse } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * 할일 수집 — 레포 전역 `- [ ]` 체크박스 중 "1회성 할일"만.
 *
 * 브레인의 체크박스는 3종류가 섞여 있다 (2026-07-21 실측):
 *   ① 1회성 할일          ← 수집 대상
 *   ② 재사용 프로토콜·체크리스트 (memory/rules/** — 영구 미체크가 정상)
 *   ③ 가이드 단계 (knowledge-hub 등 — 문서 내용)
 *
 * 노이즈는 "나이"가 아니라 "종류"라서 경로가 가장 잘 가른다.
 * 필터 실측 비교: 무필터 157 / 신선도30일 130 / 헤딩만 89 / **경로+헤딩 17**.
 * 배제된 14파일 전수 확인 결과 14/14가 ②③ 유형 = 오탈락 0.
 */
// goal 은 레포 루트 `goals/` 다 — `memory/goals` 는 존재한 적이 없다. 오타 한 줄 때문에
// status(ACTIVE|BACKLOG|DONE)·priority(P0~P2) 를 갖춘 정형 goal 16건이 통째로 안 보였다.
// collectMd 가 없는 경로를 조용히 삼켜서(아래) 아무도 눈치채지 못했다.
const SCAN_DIRS = [
  "memory/decisions",
  "memory/projects",
  "goals",
  "docs/yohanthinking/notes",
  "docs/vision",
] as const

/** 의도 헤딩 아래의 체크박스만 — 문서 본문 중간의 예시 체크박스 제외 */
const INTENT_HEADING = /^#{1,6}\s.*(다음\s?액션|할\s?일|TODO|To-?do|남은|후속)/i
const HEADING = /^#{1,6}\s/
const UNCHECKED = /^\s*-\s\[\s\]\s*(.+)$/

const EXCLUDE = /(^|\/)inbox\/archive(\/|$)/

async function collectMd(dir: string, missing?: string[]): Promise<string[]> {
  const out: string[] = []
  try {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = join(/* turbopackIgnore: true */ dir, e.name)
      if (e.isDirectory()) out.push(...(await collectMd(full, missing)))
      else if (e.name.endsWith(".md") && !e.name.startsWith("README")) out.push(full)
    }
  } catch {
    // 부재를 삼키면 SCAN_DIRS 오타가 영원히 안 드러난다(`memory/goals` 사고).
    // 최상위 스캔 경로가 없을 때만 기록한다 — 하위 재귀 실패는 소음이라 무시.
    missing?.push(dir)
  }
  return out
}

/** 할일 텍스트 → 짧은 안정 해시. 같은 문서에 같은 문장이 둘이면 id 가 겹치지만,
 *  그 경우는 사람 눈에도 같은 항목이라 실질 피해가 없다. */
function todoHash(text: string): string {
  return createHash("sha1").update(text).digest("hex").slice(0, 8)
}

function parseTodos(text: string, relPath: string): TodoItem[] {
  const items: TodoItem[] = []
  let inIntent = false
  let heading = ""
  const lines = text.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (HEADING.test(line)) {
      inIntent = INTENT_HEADING.test(line)
      heading = line.replace(/^#{1,6}\s*/, "").trim()
      continue
    }
    if (!inIntent) continue
    const m = line.match(UNCHECKED)
    if (!m) continue
    const raw = m[1].trim()
    if (!raw) continue
    items.push({
      id: `${relPath}#${todoHash(raw)}`,
      text: raw.replace(/\*\*/g, "").replace(/`/g, ""),
      relPath,
      line: i + 1,
      heading,
    })
  }
  return items
}

export async function GET() {
  const root = resolveRepoRoot()
  const todos: TodoItem[] = []
  const bySource: Record<string, number> = {}

  const missingDirs: string[] = []

  for (const dir of SCAN_DIRS) {
    const abs = join(/* turbopackIgnore: true */ root, dir)
    const missedHere: string[] = []
    for (const file of await collectMd(abs, missedHere)) {
      const rel = relative(root, file).replace(/\\/g, "/")
      if (EXCLUDE.test(rel)) continue
      try {
        const found = parseTodos(await readFile(file, "utf8"), rel)
        if (found.length) {
          todos.push(...found)
          bySource[dir] = (bySource[dir] ?? 0) + found.length
        }
      } catch {
        /* 읽기 실패 파일은 건너뛴다 */
      }
    }
    // 스캔 경로 자체가 없으면 목록에 올린다 — 오타는 "0건"이 아니라 경고로 드러나야 한다
    if (missedHere.includes(abs)) missingDirs.push(dir)
  }

  todos.sort((a, b) => b.relPath.localeCompare(a.relPath) || a.line - b.line)

  const body: TodosResponse = {
    ok: true,
    todos,
    total: todos.length,
    bySource,
    scanned: [...SCAN_DIRS],
    missingDirs,
    generatedAt: new Date().toISOString(),
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } })
}
