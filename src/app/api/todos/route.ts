import { NextResponse } from "next/server"
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
const SCAN_DIRS = [
  "memory/decisions",
  "memory/projects",
  "memory/goals",
  "docs/yohanthinking/notes",
  "docs/vision",
] as const

/** 의도 헤딩 아래의 체크박스만 — 문서 본문 중간의 예시 체크박스 제외 */
const INTENT_HEADING = /^#{1,6}\s.*(다음\s?액션|할\s?일|TODO|To-?do|남은|후속)/i
const HEADING = /^#{1,6}\s/
const UNCHECKED = /^\s*-\s\[\s\]\s*(.+)$/

const EXCLUDE = /(^|\/)inbox\/archive(\/|$)/

async function collectMd(dir: string): Promise<string[]> {
  const out: string[] = []
  try {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = join(/* turbopackIgnore: true */ dir, e.name)
      if (e.isDirectory()) out.push(...(await collectMd(full)))
      else if (e.name.endsWith(".md") && !e.name.startsWith("README")) out.push(full)
    }
  } catch {
    /* 없는 디렉토리는 조용히 건너뛴다 — SCAN_DIRS 는 선언적 목록이라 일부 부재가 정상 */
  }
  return out
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
      id: `${relPath}#${i + 1}`,
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

  for (const dir of SCAN_DIRS) {
    const abs = join(/* turbopackIgnore: true */ root, dir)
    for (const file of await collectMd(abs)) {
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
  }

  todos.sort((a, b) => b.relPath.localeCompare(a.relPath) || a.line - b.line)

  const body: TodosResponse = {
    ok: true,
    todos,
    total: todos.length,
    bySource,
    scanned: [...SCAN_DIRS],
    generatedAt: new Date().toISOString(),
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } })
}
