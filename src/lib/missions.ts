import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"

import {
  PROJECTS_PATH,
  addTaskStatus,
  createTaskSummary,
  isMissing,
  parseProjectsDocument,
  readGoalRecords,
} from "@/lib/ecosystem-projects"
import { resolveRepoRoot, resolveReposRoot } from "@/lib/paths"
import { createTtlCache } from "@/lib/server-cache"
import type { MissionCoverage, MissionRollup, MissionsResponse } from "@/lib/types"

const MISSIONS_TTL_MS = 15_000

async function readGoalStatuses(repoRoot: string): Promise<{ available: boolean; statuses: unknown[] }> {
  const result = await readGoalRecords(repoRoot)
  return {
    available: result.available,
    statuses: result.goals.filter((goal) => goal.type === "goal").map((goal) => goal.status),
  }
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
    const goals = await readGoalStatuses(join(/* turbopackIgnore: true */ reposRoot, project.name))
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
