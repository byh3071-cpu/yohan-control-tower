---
vhk_format: 1
type: goal
id: 20
title: 상시 지휘자 운영 정본과 새 세션 인수인계
status: IN_PROGRESS
priority: P0
size: L
execution_provider: native-approved
automatic_fallback: false
started: 2026-08-24
---

# Goal 20: 상시 지휘자 운영 정본과 새 세션 인수인계

## Objective

무거워진 현재 터미널 세션을 종료해도 메인·디자인·Agent Kit 작업의 소유권, 검증 근거, 사람 게이트와 정확한 다음 행동이 소실되지 않도록 프로젝트 소유 인수인계 번들을 만들고 새 지휘자 세션으로 전달한다.

## Scope

- 상시 지휘자의 S/M/L 라우팅, 단일 writer, 역할 분리, 이중 영수증과 사람 게이트 계약을 프로젝트 확장 문서로 고정한다.
- 관제탑 main, 디자인 worktree, Yohan Agent Kit worktree, 보존 대상 Orca worktree의 실제 ref·dirty·검증 상태를 하나의 원장으로 화해한다.
- 공용 세션 운영 스킬의 구현·통합·설치·실사용 상태를 서로 다른 단계로 기록한다.
- 다음 실행 순서, backlog, 금지 행동과 새 메인 지휘자의 첫 응답 계약을 durable handoff에 남긴다.
- 새 디자인 세션과 새 메인 지휘자 세션에 project-owned handoff를 전달하고 content/delivery receipt를 분리한다.

## Non-Scope

- 사용자 홈 스킬 설치, 인증·시크릿 변경, 외부 provider 유료 호출
- feature branch의 main/master 병합, PR Ready, 배포, publish
- `permit`·`tower-workbench` dirty 변경의 정리·삭제·강제 커밋
- 승인되지 않은 후속 디자인 화면 구현
- 과거 대화 전문·rollout·credential의 handoff 복제

## Completion Check

- [ ] `main-conductor-session-protocol.md`가 상시 지휘자 정체성, 라우팅, 소유권, 영수증, 재시작과 종료 계약을 기존 범용 스킬에 연결한다.
- [ ] handoff 번들이 모든 관련 worktree의 branch/ref/dirty, 검증 결과, 잔존 위험, 다음 행동과 사람 게이트를 기록한다.
- [ ] Agent Kit의 세 공용 스킬은 source 구현, branch 통합, 홈 설치, 벤더 새 세션 발견 상태가 각각 구분된다.
- [ ] 새 디자인 세션은 기존 NOW-R3·Goal 16을 다시 열지 않고 정확한 다음 디자인 게이트를 전달받는다.
- [ ] 새 메인 지휘자 세션은 Goal 20, handoff bundle, 현재 작업 원장을 전달받고 첫 응답 ACK 계약을 가진다.
- [ ] 전달 시도와 실제 ACK가 별도 영수증으로 기록되며 ACK 전 완료를 주장하지 않는다.
- [ ] Goal 전용 검사와 프로젝트 검증이 통과하고 현재 세션의 마지막 안전 checkpoint가 로컬 commit에 보존된다.

## Forbidden

- 채팅 기억이나 요약만으로 source ref·dirty·승인 상태를 추정
- 같은 branch/worktree에 두 writer를 동시에 두기
- `sent`를 `acknowledged`로 승격하거나 source 구현을 전역 설치로 표현
- 기존 dirty worktree를 새 지휘자가 임의 정리·병합·삭제
- Agent Kit feature worktree를 영구 설치 정본으로 사용
- 사용자 승인 없이 main/master merge 또는 사용자 홈 쓰기

## Evidence Plan

- `docs/operations/main-conductor-session-protocol.md`
- `docs/operations/handoffs/2026-08-24-main-conductor-handoff.md`
- `docs/operations/current-workstreams.md`
- `scripts/check-goal-20.mjs`
- Git/VHK/Orca read receipts and new-session delivery receipts
