import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

import matter from "gray-matter"
import { parse } from "yaml"

import type { GoalTask, MissionTaskSummary, MissionUnit } from "@/lib/types"

export const PROJECTS_PATH = ["memory", "core", "projects.yaml"] as const

export interface MissionDefinition {
  id: string
  label: string
  unit: MissionUnit
}

export interface ProjectDefinition {
  name: string
  mission: string
  status: string | null
  role: string | null
  reason: string | null
}

export interface ProjectsDocument {
  version: string | null
  missions: MissionDefinition[]
  projects: ProjectDefinition[]
}

export interface GoalReadResult {
  available: boolean
  goals: GoalTask[]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT"
}

function requiredRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = parent[key]
  if (!isRecord(value)) throw new Error(`projects.yaml ${key}가 객체가 아닙니다.`)
  return value
}

export function parseProjectsDocument(text: string): ProjectsDocument {
  const value: unknown = parse(text)
  if (!isRecord(value)) throw new Error("projects.yaml 최상위 구조가 객체가 아닙니다.")
  if (value.schema !== "projects" || value.schema_version !== 1) {
    throw new Error("projects.yaml schema 또는 schema_version을 지원하지 않습니다.")
  }
  if (value.status !== "active") throw new Error("projects.yaml이 active 상태가 아닙니다.")

  const missionRecord = requiredRecord(value, "missions")
  const missions = Object.entries(missionRecord).map(([id, raw]): MissionDefinition => {
    if (!isRecord(raw)) throw new Error(`미션 ${id} 정의가 객체가 아닙니다.`)
    const label = typeof raw.label_ko === "string" ? raw.label_ko.trim() : ""
    const unit = raw.unit
    if (!label) throw new Error(`미션 ${id}의 label_ko가 없습니다.`)
    if (unit !== "task" && unit !== "calendar") {
      throw new Error(`미션 ${id}의 unit이 허용값(task|calendar)이 아닙니다.`)
    }
    return { id, label, unit }
  })
  if (missions.length === 0) throw new Error("projects.yaml missions가 비어 있습니다.")

  const missionIds = new Set(missions.map((mission) => mission.id))
  const projectRecord = requiredRecord(value, "projects")
  const projects = Object.entries(projectRecord).map(([name, raw]): ProjectDefinition => {
    if (!isRecord(raw) || typeof raw.mission !== "string") {
      throw new Error(`프로젝트 ${name}의 mission이 없습니다.`)
    }
    const mission = raw.mission.trim()
    if (mission !== "unassigned" && !missionIds.has(mission)) {
      throw new Error(`프로젝트 ${name}이 존재하지 않는 미션 ${mission}을 참조합니다.`)
    }
    return {
      name,
      mission,
      status: typeof raw.status === "string" ? raw.status.trim() : null,
      role: typeof raw.role_ko === "string" ? raw.role_ko.trim() : null,
      reason: typeof raw.reason === "string" ? raw.reason.trim() : null,
    }
  })

  return {
    version: typeof value.version === "string" ? value.version : null,
    missions,
    projects,
  }
}

export async function loadProjectsDocument(brainRoot: string): Promise<ProjectsDocument | null> {
  try {
    const source = await readFile(join(/* turbopackIgnore: true */ brainRoot, ...PROJECTS_PATH), "utf8")
    return parseProjectsDocument(source)
  } catch (error: unknown) {
    if (isMissing(error)) return null
    throw error
  }
}

function normalizeScalar(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number") return String(value)
  return null
}

function countCompletionChecks(content: string): { total: number; done: number } {
  const lines = content.split(/\r?\n/)
  let inSection = false
  let total = 0
  let done = 0
  for (const line of lines) {
    if (/^##\s+Completion Check\s*$/i.test(line.trim())) {
      inSection = true
      continue
    }
    if (inSection && /^##\s+/.test(line)) break
    if (!inSection) continue
    const match = line.match(/^\s*-\s*\[([ xX])\]/)
    if (!match) continue
    total += 1
    if (match[1].toLowerCase() === "x") done += 1
  }
  return { total, done }
}

export async function readGoalRecords(repoRoot: string): Promise<GoalReadResult> {
  const goalsDir = join(/* turbopackIgnore: true */ repoRoot, "goals")
  let entries
  try {
    entries = await readdir(goalsDir, { withFileTypes: true })
  } catch (error: unknown) {
    if (isMissing(error)) return { available: false, goals: [] }
    throw error
  }

  const goals: GoalTask[] = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "_meta.md") continue
    const source = await readFile(join(/* turbopackIgnore: true */ goalsDir, entry.name), "utf8")
    const parsed = matter(source)
    const idValue = normalizeScalar(parsed.data.id)
    const numericId = idValue && /^\d+$/.test(idValue) ? Number(idValue) : null
    const title = normalizeScalar(parsed.data.title)
    const status = normalizeScalar(parsed.data.status)?.toUpperCase() ?? null
    const priority = normalizeScalar(parsed.data.priority)?.toUpperCase() ?? null
    goals.push({
      file: entry.name,
      type: normalizeScalar(parsed.data.type),
      id: numericId,
      title: title ?? entry.name.replace(/\.md$/, ""),
      titleDeclared: Boolean(title),
      status,
      priority,
      completed: normalizeScalar(parsed.data.completed),
      checks: countCompletionChecks(parsed.content),
    })
  }
  return { available: true, goals }
}

export function createTaskSummary(): MissionTaskSummary {
  return { total: 0, active: 0, queued: 0, blocked: 0, done: 0, other: 0, byStatus: {} }
}

export function addTaskStatus(summary: MissionTaskSummary, rawStatus: unknown): void {
  const status = typeof rawStatus === "string" && rawStatus.trim()
    ? rawStatus.trim().toUpperCase()
    : "UNKNOWN"

  summary.total += 1
  summary.byStatus[status] = (summary.byStatus[status] ?? 0) + 1
  if (["ACTIVE", "IN_PROGRESS", "PR_OPEN", "OBSERVING"].includes(status)) summary.active += 1
  else if (["NOT_STARTED", "BACKLOG"].includes(status)) summary.queued += 1
  else if (status === "BLOCKED") summary.blocked += 1
  else if (status === "DONE") summary.done += 1
  else summary.other += 1
}

export function summarizeGoals(goals: GoalTask[]): MissionTaskSummary {
  const summary = createTaskSummary()
  for (const goal of goals) addTaskStatus(summary, goal.status)
  return summary
}

export function isSafeRepoSlug(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value)
}
