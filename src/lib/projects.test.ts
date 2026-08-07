import assert from "node:assert/strict"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { buildProjectDetail, buildProjectsPayload } from "./projects"

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "yohan-projects-"))
  const brain = join(root, "brain")
  const repos = join(root, "repos")
  await mkdir(join(brain, "memory", "core"), { recursive: true })
  await mkdir(repos, { recursive: true })
  return { root, brain, repos }
}

const TAXONOMY = `
schema: projects
schema_version: 1
version: "0.1.1"
status: active
missions:
  ecosystem: { label_ko: "요한 생태계 구축", unit: task }
  life: { label_ko: "삶·기반", unit: calendar }
projects:
  alpha: { mission: ecosystem, status: active, role_ko: "테스트 레포" }
  beta: { mission: ecosystem, status: planned }
  undecided: { mission: unassigned, reason: needs_owner_decision }
`

test("미션→프로젝트 목록은 로컬·미클론과 Goal 집계를 구분한다", async (t) => {
  const dirs = await fixture()
  t.after(() => rm(dirs.root, { recursive: true, force: true }))
  await writeFile(join(dirs.brain, "memory", "core", "projects.yaml"), TAXONOMY, "utf8")
  await mkdir(join(dirs.repos, "alpha", "goals"), { recursive: true })
  await writeFile(join(dirs.repos, "alpha", "goals", "1-alpha.md"), `---
type: goal
id: 1
title: 알파 구현
status: IN_PROGRESS
priority: P0
---
## Completion Check
- [x] API
- [ ] UI
`, "utf8")

  const result = await buildProjectsPayload(dirs.brain, dirs.repos)
  const ecosystem = result.missions.find((mission) => mission.id === "ecosystem")
  assert.equal(result.setupRequired, false)
  assert.equal(result.missions.length, 2)
  assert.equal(result.unassignedProjects, 1)
  assert.equal(ecosystem?.projects[0].name, "alpha")
  assert.equal(ecosystem?.projects[0].local, true)
  assert.equal(ecosystem?.projects[0].tasks.active, 1)
  assert.equal(ecosystem?.projects[1].name, "beta")
  assert.equal(ecosystem?.projects[1].local, false)
  assert.equal(ecosystem?.projects[1].tasks.total, 0)
})

test("프로젝트 상세는 Task frontmatter와 완료 조건 진행률을 보존한다", async (t) => {
  const dirs = await fixture()
  t.after(() => rm(dirs.root, { recursive: true, force: true }))
  await writeFile(join(dirs.brain, "memory", "core", "projects.yaml"), TAXONOMY, "utf8")
  await mkdir(join(dirs.repos, "alpha", "goals"), { recursive: true })
  await writeFile(join(dirs.repos, "alpha", "goals", "1-alpha.md"), `---
type: goal
id: 1
title: 알파 구현
status: IN_PROGRESS
priority: P0
---
## Completion Check
- [x] API
- [ ] UI
`, "utf8")

  const detail = await buildProjectDetail(dirs.brain, dirs.repos, "alpha")
  assert.equal(detail.available, true)
  assert.equal(detail.goals.length, 1)
  assert.deepEqual(detail.goals[0].checks, { total: 2, done: 1 })
  assert.equal(detail.goals[0].status, "IN_PROGRESS")

  const missing = await buildProjectDetail(dirs.brain, dirs.repos, "beta")
  assert.equal(missing.available, false)
  assert.deepEqual(missing.goals, [])

  await assert.rejects(buildProjectDetail(dirs.brain, dirs.repos, "missing"), /projects.yaml에 없는 프로젝트/)
  await assert.rejects(buildProjectDetail(dirs.brain, dirs.repos, "../alpha"), /유효하지 않은 프로젝트 이름/)
})

test("projects.yaml이 없으면 프로젝트 API도 Setup Required를 반환한다", async (t) => {
  const dirs = await fixture()
  t.after(() => rm(dirs.root, { recursive: true, force: true }))
  const result = await buildProjectsPayload(dirs.brain, dirs.repos)
  assert.equal(result.setupRequired, true)
  assert.deepEqual(result.missions, [])
})
