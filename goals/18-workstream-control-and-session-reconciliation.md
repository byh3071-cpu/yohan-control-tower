---
vhk_format: 1
type: goal
id: 18
title: 메인·디자인·스킬 작업흐름과 Orca 세션 정산
status: DONE
priority: P0
completed: 2026-08-23
---

# Goal 18: 메인·디자인·스킬 작업흐름과 Orca 세션 정산

## Objective

관제탑 본체, 독립 디자인팀, Yohan Agent Kit의 병렬 작업을 소유권·증거·다음 게이트 기준으로 한 장에 정합하고, 완료·실패·유휴처럼 보이는 Orca 세션을 실제 Task·Dispatch·worktree 상태와 대조해 안전하게 유지 또는 정산한다.

## Scope

- 메인, 디자인, 스킬 세 작업흐름의 owner, 상태, 정본 증거, 다음 행동, 사람 게이트를 기록한다.
- Orca Run·Task·Dispatch·terminal·worktree 상태를 대조해 유지·인수감사·정산 대상을 구분한다.
- 살아 있는 독립 디자인 세션과 Agent Kit 세션에 중복되지 않는 다음 작업을 전달한다.
- 미커밋 구현, `release_unknown`, original coordinator 생존 상태를 보존 조건으로 고정한다.
- 다음 지휘자 세션이 대화 기억 없이 이어받을 수 있는 현재 작업흐름 보드를 만든다.

## Non-Scope

- 디자인 산출물 또는 Goal 14 제품 코드의 직접 구현
- Agent Kit 범용 스킬의 직접 구현·전역 설치·유료 벤더 호출
- `release_unknown` worker의 강제 종료 또는 broad terminal close
- worktree 삭제·이동, DB 수정, Orca 재시작
- commit·push·PR Ready·merge·release·publish

## Completion Check

- [x] 세 작업흐름이 각각 단일 owner, 현재 증거, 단일 다음 행동, 하드게이트를 가진다.
- [x] `tower-workbench` 미커밋 구현과 디자인 worktree가 종료·삭제 금지 대상으로 명시된다.
- [x] 완료 검수 worker의 정산 결과와 `release_unknown` 잔여 상태가 과장 없이 기록된다.
- [x] 메인·Agent Kit 재개 요청의 실제 수신 여부가 terminal 화면으로 검증된다.
- [x] 디자인 세션의 현재 수정 작업을 방해하지 않고 최종 보고 인수 조건을 유지한다.
- [x] 결정론 문서 검사와 `git diff --check`가 통과한다.

## Forbidden

- terminal preview가 비어 있다는 이유만으로 세션 종료
- Task `failed`만 보고 dirty worktree를 폐기
- 살아 있는 original coordinator와 병렬 takeover
- 전송 오류를 작업 실패 또는 작업 수신으로 추정
- Agent Kit의 복수 `IN_PROGRESS` Goal을 근거 없이 수정
- 사용자 승인 없이 전역 홈·release·PR Ready·merge 수행

## Evidence Plan

- `docs/operations/current-workstreams.md`
- Orca Run·Task·worker·terminal read-only 대조와 정확한 worker release 영수증
- 메인 workbench·디자인·Agent Kit의 Git/VHK read-only 상태
- `scripts/check-goal-18.mjs`와 `git diff --check`
- `docs/log/2026-08-23-workstream-control-and-session-reconciliation.md`

## Evidence

- `docs/operations/current-workstreams.md`: 메인·디자인·스킬의 owner, 증거, 다음 행동, 하드게이트와 세션 유지·정산 판정을 한 장에 고정했다.
- Orca Run·Task·worker 대조: Goal 14 failed Task의 dirty worktree를 보존하고, 디자인 QA·조사자의 `release_unknown`과 external terminal을 강제 정리 대상에서 제외했다.
- Goal 13 재검수 worker 정산: exact Dispatch transcript archive와 terminal close 후 `worker-show`에서 `exited`, connected false, residual resources `[]`를 확인했다. Windows stop 확인 실패로 `release_unknown`은 유지하고 broad close를 중단했다.
- 재개 전달 검증: 메인·Agent Kit의 첫 RPC가 `agent_prompt_stalled`였으나 각 terminal 화면에서 프롬프트 수신과 실제 작업 시작을 교차확인했다.
- 메인 Goal 14 인수: typecheck·lint·test·build PASS를 회수하고 Calendar 진입점 충돌을 “Home 내부 개요/캘린더 모드 전환 유지, 새 탭 없음”으로 판정해 구현·로컬 QA를 재개했다.
- 디자인 인수: 기존 P0 1건·P1 6건의 최소 수정과 Claude Code 읽기 전용 재검증이 진행 중임을 확인하고 중복 지시하지 않았다.
- Agent Kit 감사: Goal 5·8·10 복수 진행 상태, PR #79·#77·#80 계보, Goal 8 실제 final evidence 미완료, 기존 `goal-cycle`과 신규 3스킬의 경계를 회수해 G0 정산을 단일 사람 게이트로 올렸다.
- `node scripts/check-goal-18.mjs` with `VHK_GATES_SKIP_DEEP=1`: typecheck·lint·Goal 18 결정론 검사 PASS.
- 전체 gate: typecheck·lint·test PASS. sandbox build는 Google Fonts 네트워크 차단만 실패했고 네트워크 허용 동일 `npm.cmd run build`는 PASS했다.
- `git diff --check` 대상 Goal 18 문서·스크립트·next-task: whitespace error 0, 기존 LF→CRLF 경고만 확인했다.
