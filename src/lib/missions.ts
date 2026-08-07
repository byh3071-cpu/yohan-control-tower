import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"

import matter from "gray-matter"
import { parse } from "yaml"

import { resolveRepoRoot, resolveReposRoot } from "@/lib/paths"
import { createTtlCache } from "@/lib/server-cache"
import type {
  MissionCoverage,
  MissionRollup,
  MissionsResponse,
  MissionTaskSummary,
  MissionUnit,
} from "@/lib/types"

const PROJECTS_PATH = ["memory", "core", "projects.yaml"] as const
const MISSIONS_TTL_MS = 15_000

interface MissionDefinition {
  id: string
  label: string
  unit: MissionUnit
}

interface ProjectDefinition {
  name: string
  mission: string
}

interface ProjectsDocument {
  version: string | null
  missions: MissionDefinition[]
  projects: ProjectDefinition[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT"
}

function requiredRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = parent[key]
  if (!isRecord(value)) throw new Error(`projects.yaml ${key}가 객체가 아닙니다.`)
  return value
}

function parseProjectsDocument(text: string): ProjectsDocument {
  const value: unknown = parse(text)
  if (!isRecord(value)) throw new Error("projects.yaml 최상위 구조가 객체가 아닙니다.")
  if (value.schema !== "projects" || value.schema_version !== 1) {
    throw new Error("projects.yaml schema 또는 schema_version을 지원하지 않습니다.")
  }
  if (value.status !== "active") {
    throw new Error("projects.yaml이 active 상태가 아닙니다.")
  }

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
  const projects = Object.entries(projectRecord).map(([name, raw]) => {
    if (!isRecord(raw) || typeof raw.mission !== "string") {
      throw new Error(`프로젝트 ${name}의 mission이 없습니다.`)
    }
    const mission = raw.mission.trim()
    if (mission !== "unassigned" && !missionIds.has(mission)) {
      throw new Error(`프로젝트 ${name}이 존재하지 않는 미션 ${mission}을 참조합니다.`)
    }
    return { name, mission }
  })

  return {
    version: typeof value.version === "string" ? value.version : null,
    missions,
    projects,
  }
}

function createTaskSummary(): MissionTaskSummary {
  return { total: 0, active: 0, queued: 0, blocked: 0, done: 0, other: 0, byStatus: {} }
}

function addTaskStatus(summary: MissionTaskSummary, rawStatus: unknown): void {
  const status = typeof rawStatus === "string" && rawStatus.trim()
    ? rawStatus.trim().toUpperCase()
    : "UNKNOWN"

  summary.total += 1
  summary.byStatus[status] = (summary.byStatus[status] ?? 0) + 1

  if (["ACTIVE", "IN_PROGRESS", "PR_OPEN", "OBSERVING"].includes(status)) {
    summary.active += 1
  } else if (["NOT_STARTED", "BACKLOG"].includes(status)) {
    summary.queued += 1
  } else if (status === "BLOCKED") {
    summary.blocked += 1
  } else if (status === "DONE") {
    summary.done += 1
  } else {
    summary.other += 1
  }
}

async function readGoalStatuses(goalsDir: string): Promise<{ available: boolean; statuses: unknown[] }> {
  let entries
  try {
    entries = await readdir(/* turbopackIgnore: true */ goalsDir, { withFileTypes: true })
  } catch (error: unknown) {
    if (isMissing(error)) return { available: false, statuses: [] }
    throw error
  }

  const statuses: unknown[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "_meta.md") continue
    const text = await readFile(join(/* turbopackIgnore: true */ goalsDir, entry.name), "utf8")
    const frontmatter = matter(text).data
    if (frontmatter.type !== "goal") continue
    statuses.push(frontmatter.status)
  }
  return { available: true, statuses }
}

function setupRequiredResponse(): MissionsResponse {
  return {
    ok: true,
    setupRequired: true,
    missions: [],
    coverage: {
      configuredProjects: 0,
      assignedProjects: 0,
      unassignedProjects: 0,
      localAssignedProjects: 0,
      unknownAssignedProjects: 0,
    },
    sourceVersion: null,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Brain taxonomy와 로컬 클론만 조인한다. GitHub의 미클론 레포는 0으로 만들지 않고
 * projects.unknown 및 coverage.unknownAssignedProjects로 분리한다.
 */
export async function buildMissionsPayload(brainRoot: string, reposRoot: string): Promise<MissionsResponse> {
  const projectsPath = join(/* turbopackIgnore: true */ brainRoot, ...PROJECTS_PATH)
  let source: string
  try {
    source = await readFile(projectsPath, "utf8")
  } catch (error: unknown) {
    if (isMissing(error)) return setupRequiredResponse()
    throw error
  }

  const document = parseProjectsDocument(source)
  const repoEntries = await readdir(/* turbopackIgnore: true */ reposRoot, { withFileTypes: true })
  const localRepos = new Set(repoEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name))
  const rollups = new Map<string, MissionRollup>()

  for (const mission of document.missions) {
    rollups.set(mission.id, {
      id: mission.id,
      label: mission.label,
      unit: mission.unit,
      projects: { configured: 0, local: 0, withGoals: 0, unknown: 0 },
      tasks: createTaskSummary(),
    })
  }

  const coverage: MissionCoverage = {
    configuredProjects: document.projects.length,
    assignedProjects: 0,
    unassignedProjects: 0,
    localAssignedProjects: 0,
    unknownAssignedProjects: 0,
  }

  for (const project of document.projects) {
    if (project.mission === "unassigned") {
      coverage.unassignedProjects += 1
      continue
    }

    const rollup = rollups.get(project.mission)
    if (!rollup) throw new Error(`미션 ${project.mission} 롤업을 만들 수 없습니다.`)
    coverage.assignedProjects += 1
    rollup.projects.configured += 1

    if (!localRepos.has(project.name)) {
      rollup.projects.unknown += 1
      coverage.unknownAssignedProjects += 1
      continue
    }

    coverage.localAssignedProjects += 1
    rollup.projects.local += 1
    const goals = await readGoalStatuses(join(/* turbopackIgnore: true */ reposRoot, project.name, "goals"))
    if (!goals.available) continue
    rollup.projects.withGoals += 1
    for (const status of goals.statuses) addTaskStatus(rollup.tasks, status)
  }

  return {
    ok: true,
    setupRequired: false,
    missions: [...rollups.values()],
    coverage,
    sourceVersion: document.version,
    generatedAt: new Date().toISOString(),
  }
}

let stampProjectNames: { fileStamp: string; assigned: Set<string> } | null = null

async function getMissionStamp(): Promise<string> {
  const brainRoot = resolveRepoRoot()
  const projectsPath = join(/* turbopackIgnore: true */ brainRoot, ...PROJECTS_PATH)
  let projectsStat
  try {
    projectsStat = await stat(projectsPath)
  } catch (error: unknown) {
    if (isMissing(error)) return `projects-missing:${brainRoot}`
    throw error
  }

  const fileStamp = `${projectsStat.mtimeMs}:${projectsStat.size}`
  if (stampProjectNames?.fileStamp !== fileStamp) {
    const document = parseProjectsDocument(await readFile(projectsPath, "utf8"))
    stampProjectNames = {
      fileStamp,
      assigned: new Set(document.projects.filter((project) => project.mission !== "unassigned").map((project) => project.name)),
    }
  }

  const reposRoot = resolveReposRoot()
  const repoEntries = await readdir(/* turbopackIgnore: true */ reposRoot, { withFileTypes: true })
  const localAssigned = repoEntries
    .filter((entry) => entry.isDirectory() && stampProjectNames?.assigned.has(entry.name))
    .map((entry) => entry.name)
    .sort()

  const goalStamps = await Promise.all(localAssigned.map(async (name) => {
    try {
      const goalStat = await stat(join(/* turbopackIgnore: true */ reposRoot, name, "goals"))
      return `${name}:${goalStat.mtimeMs}:${goalStat.size}`
    } catch (error: unknown) {
      if (isMissing(error)) return `${name}:no-goals`
      throw error
    }
  }))

  return [fileStamp, localAssigned.join(","), ...goalStamps].join("|")
}

const missionsCache = createTtlCache<MissionsResponse>({
  ttlMs: MISSIONS_TTL_MS,
  validate: getMissionStamp,
})

async function loadMissions(): Promise<MissionsResponse> {
  const brainRoot = resolveRepoRoot()
  const projectsPath = join(/* turbopackIgnore: true */ brainRoot, ...PROJECTS_PATH)
  try {
    await stat(projectsPath)
  } catch (error: unknown) {
    if (isMissing(error)) return setupRequiredResponse()
    throw error
  }
  return buildMissionsPayload(brainRoot, resolveReposRoot())
}

export async function getMissionsCached(fresh = false): Promise<MissionsResponse> {
  if (fresh) missionsCache.clear()
  return missionsCache.get(loadMissions)
}

export function getMissionsCacheMeta() {
  return missionsCache.inspect()
}
