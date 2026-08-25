import type { TodoItem } from "./types"

const ACTIVE_GOAL_STATUSES = new Set(["ACTIVE", "IN_PROGRESS"])

export interface NowGoalSummary {
  key: string
  id: number | null
  title: string
  projectName: string | null
  remaining: number
}

export type NowTaskSelection =
  | { kind: "empty" }
  | { kind: "selection-required"; goals: NowGoalSummary[] }
  | {
      kind: "ready"
      goal: NowGoalSummary
      task: TodoItem
      nextTask: TodoItem | null
      current: number
      total: number
      done: number
    }

function goalKey(item: TodoItem): string {
  return item.relPath
}

function safeCount(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && (value ?? -1) >= 0 ? value as number : fallback
}

/** 활성 Goal이 정확히 하나일 때만 현재 Task를 고른다. priority는 자동 선택 근거로 쓰지 않는다. */
export function selectNowTask(todos: TodoItem[]): NowTaskSelection {
  const groups = new Map<string, TodoItem[]>()

  for (const item of todos) {
    if (item.origin.kind !== "goal") continue
    if (!ACTIVE_GOAL_STATUSES.has(item.origin.goalStatus ?? "")) continue
    const key = goalKey(item)
    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }

  if (groups.size === 0) return { kind: "empty" }

  const orderedGroups = [...groups.entries()].map(([key, items]) => {
    const ordered = [...items].sort((a, b) => {
      const aIndex = safeCount(a.origin.goalTaskIndex, a.line)
      const bIndex = safeCount(b.origin.goalTaskIndex, b.line)
      return aIndex - bIndex || a.line - b.line
    })
    const first = ordered[0]
    return {
      items: ordered,
      summary: {
        key,
        id: first.origin.goalId ?? null,
        title: first.origin.goalTitle?.trim() || "이름 없는 Goal",
        projectName: first.origin.projectName?.trim() || null,
        remaining: ordered.length,
      } satisfies NowGoalSummary,
    }
  }).sort((a, b) => a.summary.title.localeCompare(b.summary.title, "ko"))

  if (orderedGroups.length > 1) {
    return { kind: "selection-required", goals: orderedGroups.map((group) => group.summary) }
  }

  const selected = orderedGroups[0]
  const task = selected.items[0]
  const progress = task.origin.goalProgress
  const total = Math.max(1, safeCount(progress?.total, selected.items.length))
  const done = Math.min(total, safeCount(progress?.done, 0))
  const current = Math.min(total, Math.max(1, safeCount(task.origin.goalTaskIndex, done + 1)))

  return {
    kind: "ready",
    goal: selected.summary,
    task,
    nextTask: selected.items[1] ?? null,
    current,
    total,
    done,
  }
}
