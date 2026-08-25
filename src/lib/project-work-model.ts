import type { LintResponse, ProjectsResponse } from "@/lib/types"
import type { WorkSourceResult } from "@/lib/work-items"

export interface ProjectWorkModel {
  state: "loading" | "error" | "empty" | "partial" | "success"
  projects: ProjectsResponse | null
  lint: LintResponse | null
  errors: string[]
}
export function buildProjectWorkModel(
  projectsResult: WorkSourceResult<ProjectsResponse>,
  lintResult: WorkSourceResult<LintResponse>,
): ProjectWorkModel {
  const projects = projectsResult.status === "ready" ? projectsResult.data : null
  const lint = lintResult.status === "ready" ? lintResult.data : null
  const errors: string[] = []
  if (projectsResult.status === "error") errors.push(`프로젝트: ${projectsResult.error}`)
  if (lintResult.status === "error") errors.push(`정합성: ${lintResult.error}`)

  if (projectsResult.status === "loading") return { state: "loading", projects, lint, errors }
  if (!projects) return { state: "error", projects, lint, errors }
  if (projects.missions.every((mission) => mission.projects.length === 0)) {
    return { state: errors.length > 0 ? "partial" : "empty", projects, lint, errors }
  }
  return { state: errors.length > 0 || lintResult.status === "loading" ? "partial" : "success", projects, lint, errors }
}

export function resolveProjectSelection(
  projects: ProjectsResponse,
  requestedMissionId: string | null,
  requestedProjectName: string | null,
): { missionId: string | null; projectName: string | null; stale: boolean } {
  const requestedMission = requestedMissionId
    ? projects.missions.find((mission) => mission.id === requestedMissionId) ?? null
    : null
  const mission = requestedMission ?? projects.missions[0] ?? null
  let stale = Boolean(requestedMissionId && !requestedMission)
  if (!mission) return { missionId: null, projectName: null, stale: stale || Boolean(requestedProjectName) }
  if (!requestedProjectName) return { missionId: mission.id, projectName: null, stale }
  const selected = mission.projects.find((project) => project.name === requestedProjectName) ?? null
  if (!selected) stale = true
  return { missionId: mission.id, projectName: selected?.name ?? null, stale }
}
