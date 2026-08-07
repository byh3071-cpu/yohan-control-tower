import { readFile, readdir, stat } from "node:fs/promises"
import { join } from "node:path"

import { parse } from "yaml"

import { isMissing, isRecord, loadProjectsDocument, readGoalRecords } from "@/lib/ecosystem-projects"
import { resolveRepoRoot, resolveReposRoot } from "@/lib/paths"
import type { LintCounts, LintIssue, LintResponse, LintSeverity } from "@/lib/types"

const STANDARD_STATUSES = new Set(["NOT_STARTED", "IN_PROGRESS", "DONE", "BLOCKED"])
const STANDARD_PRIORITIES = new Set(["P0", "P1", "P2"])

interface StatusExtensions {
  [repo: string]: Set<string>
}

async function loadStatusExtensions(configPath: string): Promise<StatusExtensions> {
  let source: string
  try {
    source = await readFile(configPath, "utf8")
  } catch (error: unknown) {
    if (isMissing(error)) return {}
    throw error
  }
  const value: unknown = parse(source)
  if (!isRecord(value) || value.schema !== "goal-status-extensions" || value.schema_version !== 1) {
    throw new Error("goal status 확장 설정의 schema를 지원하지 않습니다.")
  }
  if (!isRecord(value.repos)) return {}
  return Object.fromEntries(Object.entries(value.repos).map(([repo, statuses]) => {
    if (!Array.isArray(statuses) || statuses.some((status) => typeof status !== "string")) {
      throw new Error(`goal status 확장 설정이 올바르지 않습니다: ${repo}`)
    }
    return [repo, new Set(statuses.map((status) => String(status).trim().toUpperCase()))]
  }))
}

function remoteRepoName(config: string): string | null {
  const match = config.match(/^\s*url\s*=\s*(.+)\s*$/m)
  if (!match) return null
  const normalized = match[1].trim().replace(/\\/g, "/").replace(/\.git$/, "")
  return normalized.split(/[/:]/).filter(Boolean).pop() ?? null
}

async function classifyLocalRepos(reposRoot: string): Promise<{ included: string[]; excluded: string[] }> {
  const entries = await readdir(/* turbopackIgnore: true */ reposRoot, { withFileTypes: true })
  const included: string[] = []
  const excluded: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const gitPath = join(/* turbopackIgnore: true */ reposRoot, entry.name, ".git")
    let gitStat
    try {
      gitStat = await stat(gitPath)
    } catch (error: unknown) {
      if (isMissing(error)) continue
      throw error
    }
    if (gitStat.isFile()) {
      excluded.push(entry.name)
      continue
    }
    if (!gitStat.isDirectory()) continue
    let originName: string | null = null
    try {
      originName = remoteRepoName(await readFile(join(gitPath, "config"), "utf8"))
    } catch (error: unknown) {
      if (!isMissing(error)) throw error
    }
    if (originName && originName !== entry.name) {
      excluded.push(entry.name)
      continue
    }
    included.push(entry.name)
  }
  return { included: included.sort(), excluded: excluded.sort() }
}

function issue(
  issues: LintIssue[],
  kind: LintIssue["kind"],
  severity: LintSeverity,
  project: string | null,
  file: string | null,
  code: string,
  message: string,
  suggestion: string
) {
  issues.push({
    id: [kind, project ?? "global", file ?? "none", code].join(":"),
    kind,
    severity,
    project,
    file,
    message,
    suggestion,
  })
}

function countIssues(issues: LintIssue[]): LintCounts {
  const counts: LintCounts = { total: issues.length, actionable: 0, error: 0, warning: 0, info: 0 }
  for (const item of issues) {
    counts[item.severity] += 1
    if (item.severity !== "info") counts.actionable += 1
  }
  return counts
}

export async function buildLintPayload(
  brainRoot: string,
  reposRoot: string,
  configPath = join(process.cwd(), "config", "goal-status-extensions.yaml")
): Promise<LintResponse> {
  const document = await loadProjectsDocument(brainRoot)
  if (!document) {
    return {
      ok: true,
      setupRequired: true,
      counts: countIssues([]),
      issues: [],
      excludedLocalDirs: [],
      generatedAt: new Date().toISOString(),
    }
  }

  const [local, extensions] = await Promise.all([
    classifyLocalRepos(reposRoot),
    loadStatusExtensions(configPath),
  ])
  const issues: LintIssue[] = []
  const registered = new Set(document.projects.map((project) => project.name))

  for (const project of document.projects.filter((item) => item.mission === "unassigned")) {
    const actionable = project.reason === "needs_owner_decision"
    issue(
      issues,
      "project_unassigned",
      actionable ? "warning" : "info",
      project.name,
      null,
      project.reason ?? "unknown",
      `${project.name}이 부모 미션에 배정되지 않았습니다${project.reason ? ` (${project.reason})` : ""}.`,
      actionable ? "미션 배속안을 검토한 뒤 사람이 projects.yaml에 반영하세요." : "현재 별도·아카이브 정책이 맞는지 주기적으로 검토하세요."
    )
  }

  for (const repo of local.included.filter((name) => !registered.has(name))) {
    issue(
      issues,
      "repo_unregistered",
      "warning",
      repo,
      null,
      "missing-project",
      `${repo} 로컬 레포가 projects.yaml에 등재되지 않았습니다.`,
      "정식 프로젝트라면 미션 또는 unassigned 사유를 사람이 등록하세요."
    )
  }

  for (const repo of local.included) {
    const goalResult = await readGoalRecords(join(/* turbopackIgnore: true */ reposRoot, repo))
    if (!goalResult.available) continue
    const ids = new Map<number, string>()
    for (const goal of goalResult.goals) {
      if (goal.type !== "goal") {
        issue(issues, "goal_frontmatter", "error", repo, goal.file, "type", "type: goal이 없거나 값이 다릅니다.", "Goal 파일이면 type: goal을 선언하세요.")
      }
      if (goal.id === null) {
        issue(issues, "goal_frontmatter", "error", repo, goal.file, "id", "숫자 id가 없습니다.", "레포 안에서 고유한 숫자 id를 지정하세요.")
      } else if (ids.has(goal.id)) {
        issue(issues, "goal_frontmatter", "error", repo, goal.file, `duplicate-${goal.id}`, `Goal id ${goal.id}가 ${ids.get(goal.id)}와 중복됩니다.`, "중복되지 않는 숫자 id로 사람이 수정하세요.")
      } else {
        ids.set(goal.id, goal.file)
      }
      if (!goal.titleDeclared) {
        issue(issues, "goal_frontmatter", "error", repo, goal.file, "title", "title이 없습니다.", "한 줄 Goal 제목을 선언하세요.")
      }
      if (!goal.status) {
        issue(issues, "goal_frontmatter", "error", repo, goal.file, "status", "status가 없습니다.", "VHK 표준 status를 선언하세요.")
      } else if (!STANDARD_STATUSES.has(goal.status) && !extensions[repo]?.has(goal.status)) {
        issue(issues, "goal_status_extension", "warning", repo, goal.file, goal.status, `확장 status ${goal.status}가 레포 허용 목록에 없습니다.`, "유효한 확장이라면 설정에 제안하고, 아니면 표준 status로 사람이 정리하세요.")
      }
      if (!goal.priority || !STANDARD_PRIORITIES.has(goal.priority)) {
        issue(issues, "goal_frontmatter", "error", repo, goal.file, "priority", "priority가 P0|P1|P2가 아닙니다.", "우선순위를 P0, P1, P2 중 하나로 지정하세요.")
      }
    }
  }

  return {
    ok: true,
    setupRequired: false,
    counts: countIssues(issues),
    issues,
    excludedLocalDirs: local.excluded,
    generatedAt: new Date().toISOString(),
  }
}

export async function getLint(): Promise<LintResponse> {
  return buildLintPayload(resolveRepoRoot(), resolveReposRoot())
}
