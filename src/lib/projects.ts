import { readdir } from "node:fs/promises"
import { join } from "node:path"

import {
  isSafeRepoSlug,
  loadProjectsDocument,
  readGoalRecords,
  summarizeGoals,
} from "@/lib/ecosystem-projects"
import { resolveRepoRoot, resolveReposRoot } from "@/lib/paths"
import type {
  ProjectDetailResponse,
  ProjectMissionGroup,
  ProjectsResponse,
  ProjectSummary,
} from "@/lib/types"

function setupRequiredProjects(): ProjectsResponse {
  return {
    ok: true,
    setupRequired: true,
    missions: [],
    unassignedProjects: 0,
    sourceVersion: null,
    generatedAt: new Date().toISOString(),
  }
}

export async function buildProjectsPayload(brainRoot: string, reposRoot: string): Promise<ProjectsResponse> {
  const document = await loadProjectsDocument(brainRoot)
  if (!document) return setupRequiredProjects()

  const repoEntries = await readdir(/* turbopackIgnore: true */ reposRoot, { withFileTypes: true })
  const localRepos = new Set(repoEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name))
  const groups = new Map<string, ProjectMissionGroup>()
  for (const mission of document.missions) {
    groups.set(mission.id, { ...mission, projects: [] })
  }

  let unassignedProjects = 0
  for (const project of document.projects) {
    if (project.mission === "unassigned") {
      unassignedProjects += 1
      continue
    }
    const group = groups.get(project.mission)
    if (!group) throw new Error(`미션 ${project.mission} 그룹을 만들 수 없습니다.`)
    const local = localRepos.has(project.name)
    const goalResult = local
      ? await readGoalRecords(join(/* turbopackIgnore: true */ reposRoot, project.name))
      : { available: false, goals: [] }
    const validGoals = goalResult.goals.filter((goal) => goal.type === "goal")
    group.projects.push({
      name: project.name,
      mission: project.mission,
      status: project.status,
      role: project.role,
      local,
      goalsAvailable: goalResult.available,
      tasks: summarizeGoals(validGoals),
    })
  }

  for (const group of groups.values()) {
    group.projects.sort((a, b) => Number(b.local) - Number(a.local) || a.name.localeCompare(b.name))
  }

  return {
    ok: true,
    setupRequired: false,
    missions: [...groups.values()],
    unassignedProjects,
    sourceVersion: document.version,
    generatedAt: new Date().toISOString(),
  }
}

export async function buildProjectDetail(
  brainRoot: string,
  reposRoot: string,
  slug: string
): Promise<ProjectDetailResponse> {
  if (!isSafeRepoSlug(slug)) throw new Error("유효하지 않은 프로젝트 이름입니다.")
  const document = await loadProjectsDocument(brainRoot)
  if (!document) {
    return {
      ok: true,
      setupRequired: true,
      project: null,
      goals: [],
      available: false,
      generatedAt: new Date().toISOString(),
    }
  }

  const definition = document.projects.find((project) => project.name === slug)
  if (!definition) throw new Error(`projects.yaml에 없는 프로젝트입니다: ${slug}`)
  const repoEntries = await readdir(/* turbopackIgnore: true */ reposRoot, { withFileTypes: true })
  const local = repoEntries.some((entry) => entry.isDirectory() && entry.name === slug)
  const goalResult = local
    ? await readGoalRecords(join(/* turbopackIgnore: true */ reposRoot, slug))
    : { available: false, goals: [] }
  const validGoals = goalResult.goals.filter((goal) => goal.type === "goal")
  const project: ProjectSummary = {
    name: definition.name,
    mission: definition.mission,
    status: definition.status,
    role: definition.role,
    local,
    goalsAvailable: goalResult.available,
    tasks: summarizeGoals(validGoals),
  }

  return {
    ok: true,
    setupRequired: false,
    project,
    goals: goalResult.goals,
    available: local,
    generatedAt: new Date().toISOString(),
  }
}

export async function getProjects(): Promise<ProjectsResponse> {
  return buildProjectsPayload(resolveRepoRoot(), resolveReposRoot())
}

export async function getProjectDetail(slug: string): Promise<ProjectDetailResponse> {
  return buildProjectDetail(resolveRepoRoot(), resolveReposRoot(), slug)
}
