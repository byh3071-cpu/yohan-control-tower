import assert from "node:assert/strict"
import test from "node:test"

import { buildProjectWorkModel, resolveProjectSelection } from "@/lib/project-work-model"
import type { LintResponse, ProjectsResponse } from "@/lib/types"

const projects: ProjectsResponse = {
  ok: true,
  setupRequired: false,
  missions: [{
    id: "work",
    label: "작업",
    unit: "task",
    projects: [{
      name: "control-tower",
      mission: "work",
      status: "active",
      role: "관제",
      local: true,
      goalsAvailable: true,
      tasks: { total: 1, active: 1, queued: 0, blocked: 0, done: 0, other: 0, byStatus: { IN_PROGRESS: 1 } },
    }],
  }],
  unassignedProjects: 0,
  sourceVersion: "1",
  generatedAt: "2026-08-25T00:00:00.000Z",
}

const lint: LintResponse = {
  ok: true,
  setupRequired: false,
  counts: { total: 0, actionable: 0, error: 0, warning: 0, info: 0 },
  issues: [],
  excludedLocalDirs: [],
  generatedAt: "2026-08-25T00:00:00.000Z",
}

test("projects와 lint를 독립 상태로 유지해 일부 실패를 partial로 표시한다", () => {
  const partial = buildProjectWorkModel(
    { status: "ready", data: projects },
    { status: "error", error: "lint 실패" },
  )
  assert.equal(partial.state, "partial")
  assert.equal(partial.projects, projects)
  assert.equal(partial.lint, null)
  assert.deepEqual(partial.errors, ["정합성: lint 실패"])

  assert.equal(buildProjectWorkModel({ status: "error", error: "projects 실패" }, { status: "ready", data: lint }).state, "error")
})
test("URL selection이 현재 목록에 없으면 fail-closed로 해제한다", () => {
  assert.deepEqual(resolveProjectSelection(projects, "work", "control-tower"), {
    missionId: "work",
    projectName: "control-tower",
    stale: false,
  })
  assert.deepEqual(resolveProjectSelection(projects, "work", "removed-project"), {
    missionId: "work",
    projectName: null,
    stale: true,
  })
})
