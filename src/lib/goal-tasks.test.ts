import assert from "node:assert/strict"
import test from "node:test"

import { parseGoalCompletionTasks, stableTodoId } from "./goal-tasks"
import type { TodoOrigin } from "./types"

const ORIGIN: TodoOrigin = {
  kind: "goal",
  goalId: 16,
  goalTitle: "실데이터 기반 NOW-R3 지금 화면 구현",
  goalStatus: "IN_PROGRESS",
  priority: "P0",
}

test("Goal Completion Check는 완료 진행률과 원래 Task 순서를 보존한다", () => {
  const parsed = parseGoalCompletionTasks(`
# Goal 16

## Completion Check

- [x] 데이터 계약을 만든다.
- [ ] **지금 화면**을 구현한다.
- [ ] \`build\`를 통과한다.

## Forbidden
- [ ] 이 체크박스는 Task가 아니다.
`, "goals/16-live-now-r3.md", ORIGIN)

  assert.equal(parsed.hasCompletionChecks, true)
  assert.equal(parsed.items.length, 2)
  assert.deepEqual(parsed.items.map((item) => item.text), ["지금 화면을 구현한다.", "build를 통과한다."])
  assert.deepEqual(parsed.items.map((item) => item.origin.goalTaskIndex), [2, 3])
  assert.deepEqual(parsed.items[0].origin.goalProgress, { total: 3, done: 1 })
  assert.equal(parsed.items[0].id, stableTodoId("goals/16-live-now-r3.md", "지금 화면을 구현한다.", parsed.items[0].line))
})

test("Completion Check가 없으면 기존 Goal fallback이 동작하도록 구분한다", () => {
  const parsed = parseGoalCompletionTasks("## 다음 액션\n- [ ] 기존 작업", "goals/1-legacy.md", ORIGIN)
  assert.equal(parsed.hasCompletionChecks, false)
  assert.deepEqual(parsed.items, [])
})

test("모든 Completion Check가 끝나면 진행률만 계산하고 미완료 Task는 만들지 않는다", () => {
  const parsed = parseGoalCompletionTasks("## 완료 조건\n- [x] 하나\n- [X] 둘", "goals/1-done.md", ORIGIN)
  assert.equal(parsed.hasCompletionChecks, true)
  assert.deepEqual(parsed.items, [])
})

test("기존 Goal의 'Goal n 완료 대기'도 남은 Task 계약으로 읽는다", () => {
  const parsed = parseGoalCompletionTasks("## Goal 22 완료 대기\n- [x] 방향 승인\n- [ ] 모바일 UAT", "goals/22.md", ORIGIN)
  assert.equal(parsed.hasCompletionChecks, true)
  assert.equal(parsed.items[0]?.text, "모바일 UAT")
  assert.deepEqual(parsed.items[0]?.origin.goalProgress, { total: 2, done: 1 })
  assert.equal(parsed.items[0]?.origin.goalTaskIndex, 2)
})

test("같은 파일의 동일 문구 Completion Check는 line discriminator로 고유한 key를 갖는다", () => {
  const parsed = parseGoalCompletionTasks(`
## Completion Check
- [ ] 같은 검증을 실행한다.
- [ ] 같은 검증을 실행한다.
`, "goals/23-duplicate.md", ORIGIN)

  assert.equal(parsed.items.length, 2)
  assert.equal(parsed.items[0]?.text, parsed.items[1]?.text)
  assert.notEqual(parsed.items[0]?.line, parsed.items[1]?.line)
  assert.notEqual(parsed.items[0]?.id, parsed.items[1]?.id)
  assert.equal(parsed.items[0]?.id, stableTodoId("goals/23-duplicate.md", "같은 검증을 실행한다.", parsed.items[0]?.line))
  assert.equal(parsed.items[1]?.id, stableTodoId("goals/23-duplicate.md", "같은 검증을 실행한다.", parsed.items[1]?.line))
})
