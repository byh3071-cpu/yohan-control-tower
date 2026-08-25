import assert from "node:assert/strict"
import test from "node:test"

import { selectNowTask } from "./now-task"
import type { TodoItem } from "./types"

function task(overrides: Partial<TodoItem> & { relPath: string; text: string }): TodoItem {
  const { origin: originOverride, ...itemOverrides } = overrides
  return {
    id: `${itemOverrides.relPath}#${itemOverrides.text}`,
    line: 20,
    heading: "Completion Check",
    ...itemOverrides,
    origin: {
      kind: "goal",
      goalId: 16,
      goalTitle: "지금 화면 구현",
      projectName: "yohan-control-tower",
      goalStatus: "IN_PROGRESS",
      priority: "P0",
      goalProgress: { total: 4, done: 1 },
      goalTaskIndex: 2,
      ...originOverride,
    },
  }
}

test("활성 Goal이 없으면 문서 Todo와 대기 Goal을 현재 Task로 승격하지 않는다", () => {
  const selection = selectNowTask([
    task({ relPath: "goals/2.md", text: "대기", origin: { kind: "goal", goalStatus: "NOT_STARTED" } }),
    task({ relPath: "docs/note.md", text: "문서", origin: { kind: "doc" } }),
  ])
  assert.deepEqual(selection, { kind: "empty" })
})

test("활성 Goal이 하나면 첫 미완료 Task와 실제 진행률을 선택한다", () => {
  const selection = selectNowTask([
    task({ relPath: "goals/16.md", text: "세 번째", line: 30, origin: { kind: "goal", goalTaskIndex: 3 } }),
    task({ relPath: "goals/16.md", text: "두 번째", line: 20, origin: { kind: "goal", goalTaskIndex: 2 } }),
  ])
  assert.equal(selection.kind, "ready")
  if (selection.kind !== "ready") return
  assert.equal(selection.task.text, "두 번째")
  assert.equal(selection.nextTask?.text, "세 번째")
  assert.equal(selection.goal.projectName, "yohan-control-tower")
  assert.deepEqual({ current: selection.current, total: selection.total, done: selection.done }, { current: 2, total: 4, done: 1 })
})

test("활성 Goal이 복수면 priority가 달라도 하나를 임의 선택하지 않는다", () => {
  const selection = selectNowTask([
    task({ relPath: "goals/13.md", text: "실제 승인", origin: { kind: "goal", goalId: 13, goalTitle: "승인 증명", priority: "P0" } }),
    task({ relPath: "goals/16.md", text: "지금 화면", origin: { kind: "goal", goalId: 16, goalTitle: "지금 화면 구현", priority: "P2" } }),
  ])
  assert.equal(selection.kind, "selection-required")
  if (selection.kind !== "selection-required") return
  assert.deepEqual(selection.goals.map((goal) => goal.id).sort(), [13, 16])
})
