import assert from "node:assert/strict"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { buildLintPayload } from "./lint"

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "yohan-lint-"))
  const brain = join(root, "brain")
  const repos = join(root, "repos")
  const config = join(root, "extensions.yaml")
  await mkdir(join(brain, "memory", "core"), { recursive: true })
  await mkdir(repos, { recursive: true })
  await writeFile(join(brain, "memory", "core", "projects.yaml"), `
schema: projects
schema_version: 1
version: "0.1.1"
status: active
missions:
  ecosystem: { label_ko: "요한 생태계 구축", unit: task }
projects:
  registered: { mission: ecosystem, status: active }
  undecided: { mission: unassigned, reason: needs_owner_decision }
  archive: { mission: unassigned, reason: archived }
`, "utf8")
  await writeFile(config, `
schema: goal-status-extensions
schema_version: 1
repos:
  registered: [DEFERRED]
`, "utf8")
  return { root, brain, repos, config }
}

async function makeRepo(repos: string, name: string, origin = name) {
  await mkdir(join(repos, name, ".git"), { recursive: true })
  await writeFile(join(repos, name, ".git", "config"), `[remote "origin"]\n  url = git@github.com:owner/${origin}.git\n`, "utf8")
}

test("F006은 미배정·미등재·Goal frontmatter 결함을 한 번에 보고한다", async (t) => {
  const dirs = await fixture()
  t.after(() => rm(dirs.root, { recursive: true, force: true }))
  await makeRepo(dirs.repos, "registered")
  await makeRepo(dirs.repos, "unlisted")
  await mkdir(join(dirs.repos, "registered", "goals"), { recursive: true })
  await writeFile(join(dirs.repos, "registered", "goals", "1-valid.md"), `---
type: goal
id: 1
title: 허용 확장
status: DEFERRED
priority: P1
---
`, "utf8")
  await writeFile(join(dirs.repos, "registered", "goals", "broken.md"), `---
status: STRANGE
---
`, "utf8")

  const result = await buildLintPayload(dirs.brain, dirs.repos, dirs.config)
  assert.equal(result.setupRequired, false)
  assert.equal(result.issues.filter((item) => item.kind === "project_unassigned").length, 2)
  assert.equal(result.issues.filter((item) => item.kind === "repo_unregistered").length, 1)
  assert.ok(result.issues.some((item) => item.kind === "goal_frontmatter" && item.file === "broken.md"))
  assert.ok(result.issues.some((item) => item.kind === "goal_status_extension" && item.file === "broken.md"))
  assert.equal(result.issues.some((item) => item.kind === "goal_status_extension" && item.file === "1-valid.md"), false)
  assert.ok(result.counts.actionable > 0)
})

test("Git worktree와 원격 이름이 다른 변형 디렉터리는 미등재 레포에서 제외한다", async (t) => {
  const dirs = await fixture()
  t.after(() => rm(dirs.root, { recursive: true, force: true }))
  await makeRepo(dirs.repos, "registered")
  await makeRepo(dirs.repos, "registered-privacy-v3", "registered")
  await mkdir(join(dirs.repos, "registered-wt"), { recursive: true })
  await writeFile(join(dirs.repos, "registered-wt", ".git"), "gitdir: ../registered/.git/worktrees/registered-wt\n", "utf8")

  const result = await buildLintPayload(dirs.brain, dirs.repos, dirs.config)
  assert.deepEqual(result.excludedLocalDirs, ["registered-privacy-v3", "registered-wt"])
  assert.equal(result.issues.some((item) => item.kind === "repo_unregistered"), false)
})

test("projects.yaml 부재는 lint 0건 성공이 아니라 Setup Required다", async (t) => {
  const dirs = await fixture()
  t.after(() => rm(dirs.root, { recursive: true, force: true }))
  await rm(join(dirs.brain, "memory", "core", "projects.yaml"))
  const result = await buildLintPayload(dirs.brain, dirs.repos, dirs.config)
  assert.equal(result.setupRequired, true)
  assert.equal(result.counts.total, 0)
})
