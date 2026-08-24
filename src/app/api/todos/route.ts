import { NextResponse } from "next/server"
import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { isSafeRepoSlug, loadProjectsDocument } from "@/lib/ecosystem-projects"
import { parseGoalCompletionTasks, stableTodoId } from "@/lib/goal-tasks"
import { resolveRepoRoot, resolveReposRoot } from "@/lib/paths"
import { isDocPathAllowed } from "@/lib/memory"
import type { TodoItem, TodoOrigin, TodosResponse } from "@/lib/types"

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
// Goal은 Brain 단일 폴더가 아니라 projects.yaml에 등록된 active 프로젝트의 `<repo>/goals`에서 읽는다.
// `memory/goals` 같은 추론 폴백은 쓰지 않고, 프로젝트명만 브라우저 payload에 남긴다.
const SCAN_DIRS = [
  "memory/decisions",
  "memory/projects",
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

/**
 * 이 할일의 출처 문서를 대시보드 뷰어(`/api/docs`)로 열 수 있으면 그 **코퍼스 상대경로**를,
 * 없으면 undefined 를 준다.
 *
 * todos 는 레포루트 기준 relPath(`memory/decisions/…`·`goals/…`·`docs/…`)를 쓰는데,
 * 뷰어 코퍼스는 memory/ 기준(`decisions/…`)이라 기준이 다르다. 접두 `memory/` 를 떼고
 * allowlist(`isDocPathAllowed`)로 대조해 실제 열람 가능한 것만 링크한다.
 * goals/·docs/ 는 코퍼스 밖이라 undefined → UI 에서 클릭 불가 라벨로 표시(죽은 버튼 금지).
 */
function deriveOpenPath(relPath: string): string | undefined {
  const MEM = "memory/"
  if (!relPath.startsWith(MEM)) return undefined
  const corpusRel = relPath.slice(MEM.length)
  return isDocPathAllowed(corpusRel) ? corpusRel : undefined
}

function parseTodos(text: string, relPath: string, origin: TodoOrigin): TodoItem[] {
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
      id: stableTodoId(relPath, raw),
      text: raw.replace(/\*\*/g, "").replace(/`/g, ""),
      relPath,
      line: i + 1,
      heading,
      origin,
    })
  }
  return items
}

/* ── goal 수집 ─────────────────────────────────────────────────────────────
 * goal 파일은 일반 문서와 파싱 규칙이 다르다.
 *   ① `type: goal` frontmatter 를 가진 `goals/*.md` (`_meta.md` 제외)
 *   ② `status: DONE` 은 제외 — 완료 목표의 잔여 체크박스가 할일로 새는 걸 막는다
 *   ③ 의도 헤딩(다음 액션·할일…) 아래 체크박스가 있으면 그걸 항목으로,
 *      없으면 goal 제목 자체를 1건으로 (실측: goal 10개 중 의도 헤딩 보유 0건 →
 *      면제하면 "성공 정의" 같은 완료조건이 새고, 제목 fallback 이 정답).
 * status/priority 는 닫힌집합이라 allowlist 대조(PAT-001). 미지값은 버리지 말고
 * "unknown"/"P2" 로 통과시켜 UI 에 드러낸다(조용한 부재 회피). */
const GOAL_STATUS = new Set(["ACTIVE", "IN_PROGRESS", "NOT_STARTED", "BACKLOG", "BLOCKED", "DONE"])
const GOAL_PRIORITY = new Set(["P0", "P1", "P2"])

function normStatus(raw: string | undefined): string {
  const v = (raw ?? "").trim().toUpperCase()
  return GOAL_STATUS.has(v) ? v : "unknown"
}
function normPriority(raw: string | undefined): "P0" | "P1" | "P2" {
  const v = (raw ?? "").trim().toUpperCase()
  return (GOAL_PRIORITY.has(v) ? v : "P2") as "P0" | "P1" | "P2"
}

/** frontmatter 최상위 key: value 만 얕게 파싱 (goal 스키마는 평면이라 충분) */
function parseFrontmatter(text: string): Record<string, string> {
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const fm: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (mm) fm[mm[1]] = mm[2].trim().replace(/^["']|["']$/g, "")
  }
  return fm
}

async function collectGoals(
  goalsDir: string,
  repoRoot: string,
  projectName: string,
  missing?: string[],
): Promise<TodoItem[]> {
  const items: TodoItem[] = []
  let entries
  try {
    entries = await readdir(/* turbopackIgnore: true */ goalsDir, { withFileTypes: true })
  } catch {
    missing?.push(`${projectName}/goals`)
    return items
  }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md") || e.name === "_meta.md") continue
    const abs = join(/* turbopackIgnore: true */ goalsDir, e.name)
    const repoRel = relative(repoRoot, abs).replace(/\\/g, "/")
    const rel = `${projectName}/${repoRel}`
    let text: string
    try {
      text = await readFile(abs, "utf8")
    } catch {
      continue
    }
    const fm = parseFrontmatter(text)
    if (fm.type !== "goal") continue
    const status = normStatus(fm.status)
    if (status === "DONE") continue // 죽은 체크박스 차단
    const goalId = Number(fm.id)
    const goalTitle = fm.title || rel.split("/").pop()!.replace(/\.md$/, "")
    const origin: TodoOrigin = {
      kind: "goal",
      projectName,
      goalId: Number.isFinite(goalId) ? goalId : undefined,
      goalTitle,
      goalStatus: status,
      priority: normPriority(fm.priority),
      openPath: deriveOpenPath(rel), // goals/ 는 코퍼스 밖 → 항상 undefined (클릭 불가 라벨)
    }
    const completion = parseGoalCompletionTasks(text, rel, origin)
    if (completion.hasCompletionChecks) {
      items.push(...completion.items)
      continue
    }
    // 의도 헤딩 아래 체크박스 우선, 없으면 goal 제목 1건
    const scoped = parseTodos(text, rel, origin)
    if (scoped.length) {
      items.push(...scoped)
    } else {
      items.push({
        id: `${rel}#goal`,
        text: goalTitle,
        relPath: rel,
        line: 1,
        heading: "goal",
        origin,
      })
    }
  }
  return items
}

async function collectConfiguredProjectGoals(
  brainRoot: string,
  missingDirs: string[],
): Promise<{ items: TodoItem[]; configuredProjects: number; localProjects: number }> {
  const document = await loadProjectsDocument(brainRoot)
  if (!document) throw new Error("프로젝트 원장이 없습니다.")

  const reposRoot = resolveReposRoot()
  const repoEntries = await readdir(/* turbopackIgnore: true */ reposRoot, { withFileTypes: true })
  const localRepos = new Set(repoEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name))
  const configured = document.projects.filter((project) => (
    project.mission !== "unassigned" && project.status?.toLowerCase() === "active"
  ))
  const items: TodoItem[] = []
  let localProjects = 0

  for (const project of configured) {
    if (!isSafeRepoSlug(project.name)) throw new Error("유효하지 않은 프로젝트 이름입니다.")
    if (!localRepos.has(project.name)) continue
    localProjects += 1
    const repoRoot = join(/* turbopackIgnore: true */ reposRoot, project.name)
    items.push(...await collectGoals(
      join(/* turbopackIgnore: true */ repoRoot, "goals"),
      repoRoot,
      project.name,
      missingDirs,
    ))
  }

  return { items, configuredProjects: configured.length, localProjects }
}

export async function GET() {
  const root = resolveRepoRoot()
  const todos: TodoItem[] = []
  const bySource: Record<string, number> = {}

  const missingDirs: string[] = []

  let goalScope: TodosResponse["goalScope"]
  try {
    const projectGoals = await collectConfiguredProjectGoals(root, missingDirs)
    todos.push(...projectGoals.items)
    if (projectGoals.items.length) bySource["projects/*/goals"] = projectGoals.items.length
    goalScope = {
      ok: true,
      configuredProjects: projectGoals.configuredProjects,
      localProjects: projectGoals.localProjects,
    }
  } catch {
    goalScope = {
      ok: false,
      configuredProjects: 0,
      localProjects: 0,
      error: "프로젝트 Goal 원장을 읽지 못했습니다.",
    }
  }

  for (const dir of SCAN_DIRS) {
    const abs = join(/* turbopackIgnore: true */ root, dir)

    const missedHere: string[] = []
    for (const file of await collectMd(abs, missedHere)) {
      const rel = relative(root, file).replace(/\\/g, "/")
      if (EXCLUDE.test(rel)) continue
      try {
        const found = parseTodos(await readFile(file, "utf8"), rel, {
          kind: "doc",
          openPath: deriveOpenPath(rel),
        })
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
    scanned: ["memory/core/projects.yaml → <repo>/goals", ...SCAN_DIRS],
    missingDirs,
    goalScope,
    generatedAt: new Date().toISOString(),
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } })
}
