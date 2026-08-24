import { createHash } from "node:crypto"

import type { TodoItem, TodoOrigin } from "./types"

const HEADING = /^#{1,6}\s+(.*)$/
const COMPLETION_HEADING = /^(completion check|완료 조건|(?:goal\s+\d+\s+)?완료 대기)$/i
const CHECKBOX = /^\s*-\s\[([ xX])\]\s*(.+)$/

export interface ParsedGoalTasks {
  hasCompletionChecks: boolean
  items: TodoItem[]
}

export function stableTodoId(relPath: string, text: string): string {
  const digest = createHash("sha1").update(text).digest("hex").slice(0, 8)
  return `${relPath}#${digest}`
}

function plainTaskText(text: string): string {
  return text.trim().replace(/\*\*/g, "").replace(/`/g, "")
}

/** Goal의 Completion Check를 화면의 Task로 변환한다. 완료 항목은 진행률에만 남긴다. */
export function parseGoalCompletionTasks(
  text: string,
  relPath: string,
  origin: TodoOrigin,
): ParsedGoalTasks {
  const checks: Array<{ done: boolean; line: number; text: string }> = []
  let inCompletionChecks = false

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const heading = line.match(HEADING)
    if (heading) {
      inCompletionChecks = COMPLETION_HEADING.test(heading[1].trim())
      continue
    }
    if (!inCompletionChecks) continue

    const checkbox = line.match(CHECKBOX)
    if (!checkbox) continue
    const taskText = plainTaskText(checkbox[2])
    if (!taskText) continue
    checks.push({ done: checkbox[1].toLowerCase() === "x", line: index + 1, text: taskText })
  }

  if (checks.length === 0) return { hasCompletionChecks: false, items: [] }

  const progress = {
    total: checks.length,
    done: checks.filter((check) => check.done).length,
  }
  const items = checks.flatMap<TodoItem>((check, index) => {
    if (check.done) return []
    return [{
      id: stableTodoId(relPath, check.text),
      text: check.text,
      relPath,
      line: check.line,
      heading: "Completion Check",
      origin: {
        ...origin,
        goalProgress: progress,
        goalTaskIndex: index + 1,
      },
    }]
  })

  return { hasCompletionChecks: true, items }
}
