import assert from "node:assert/strict"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { buildMissionsPayload } from "./missions"

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "yohan-missions-"))
  const brain = join(root, "yohan-brain")
  const repos = join(root, "repos")
  await mkdir(join(brain, "memory", "core"), { recursive: true })
  await mkdir(repos, { recursive: true })
  return { root, brain, repos }
}

test("projects.yaml 부재는 빈 성공이 아니라 setupRequired로 구분한다", async (t) => {
  const dirs = await fixture()
  t.after(async () => rm(dirs.root, { recursive: true, force: true }))

  const result = await buildMissionsPayload(dirs.brain, dirs.repos)
  assert.equal(result.ok, true)
  assert.equal(result.setupRequired, true)
  assert.deepEqual(result.missions, [])
})

test("미션별 로컬 프로젝트와 Goal 상태를 집계하고 미클론은 unknown으로 남긴다", async (t) => {
  const dirs = await fixture()
  t.after(async () => rm(dirs.root, { recursive: true, force: true }))

  await writeFile(join(dirs.brain, "memory", "core", "projects.yaml"), `
schema: projects
schema_version: 1
version: "0.1.1"
status: active
missions:
  ecosystem: { label_ko: "요한 생태계 구축", unit: task }
  life: { label_ko: "삶·기반", unit: calendar }
projects:
  repo-a: { mission: ecosystem, status: active }
  repo-b: { mission: ecosystem, status: active }
  repo-life: { mission: life, status: active }
  repo-later: { mission: unassigned, reason: needs_owner_decision }
`, "utf8")

  await mkdir(join(dirs.repos, "repo-a", "goals"), { recursive: true })
  await mkdir(join(dirs.repos, "repo-life"), { recursive: true })
  await writeFile(join(dirs.repos, "repo-a", "goals", "1-active.md"), `---
type: goal
id: 1
title: 진행 목표
status: IN_PROGRESS
priority: P0
---
`, "utf8")
  await writeFile(join(dirs.repos, "repo-a", "goals", "2-done.md"), `---
type: goal
id: 2
title: 완료 목표
status: DONE
priority: P1
---
`, "utf8")
  await writeFile(join(dirs.repos, "repo-a", "goals", "3-extended.md"), `---
type: goal
id: 3
title: 확장 상태 목표
status: DEFERRED
priority: P2
---
`, "utf8")
  await writeFile(join(dirs.repos, "repo-a", "goals", "note.md"), `---
type: note
status: BLOCKED
---
`, "utf8")

  const result = await buildMissionsPayload(dirs.brain, dirs.repos)
  const ecosystem = result.missions.find((mission) => mission.id === "ecosystem")
  const life = result.missions.find((mission) => mission.id === "life")

  assert.equal(result.setupRequired, false)
  assert.deepEqual(result.coverage, {
    configuredProjects: 4,
    assignedProjects: 3,
    unassignedProjects: 1,
    localAssignedProjects: 2,
    unknownAssignedProjects: 1,
  })
  assert.deepEqual(ecosystem?.projects, { configured: 2, local: 1, withGoals: 1, unknown: 1 })
  assert.deepEqual(ecosystem?.tasks, {
    total: 3,
    active: 1,
    queued: 0,
    blocked: 0,
    done: 1,
    other: 1,
    byStatus: { IN_PROGRESS: 1, DONE: 1, DEFERRED: 1 },
  })
  assert.equal(life?.unit, "calendar")
  assert.deepEqual(life?.projects, { configured: 1, local: 1, withGoals: 0, unknown: 0 })
  assert.equal(life?.tasks.total, 0)
})

test("존재하지 않는 미션 참조는 조용히 누락하지 않고 실패한다", async (t) => {
  const dirs = await fixture()
  t.after(async () => rm(dirs.root, { recursive: true, force: true }))

  await writeFile(join(dirs.brain, "memory", "core", "projects.yaml"), `
schema: projects
schema_version: 1
version: "0.1.1"
status: active
missions:
  ecosystem: { label_ko: "요한 생태계 구축", unit: task }
projects:
  broken: { mission: missing }
`, "utf8")

  await assert.rejects(
    buildMissionsPayload(dirs.brain, dirs.repos),
    /존재하지 않는 미션 missing/
  )
})

test("active taxonomy의 미션 목록이 비어 있으면 실패한다", async (t) => {
  const dirs = await fixture()
  t.after(async () => rm(dirs.root, { recursive: true, force: true }))

  await writeFile(join(dirs.brain, "memory", "core", "projects.yaml"), `
schema: projects
schema_version: 1
version: "0.1.1"
status: active
missions: {}
projects: {}
`, "utf8")

  await assert.rejects(
    buildMissionsPayload(dirs.brain, dirs.repos),
    /missions가 비어 있습니다/
  )
})
