---
vhk_format: 1
type: goal
id: 17
title: 디자인팀 인수 상태와 Orca 런타임 사고 증거 고정
status: DONE
priority: P0
completed: 2026-08-23
---

# Goal 17: 디자인팀 인수 상태와 Orca 런타임 사고 증거 고정

## Objective

디자인팀·독립 QA 검토자·장애 조사자의 실제 산출물 인수 상태를 프로젝트 보고서로 고정하고, 독립 조사 보고서가 유실된 Orca 런타임 장애를 지휘자 대체 조사로 사실·가설·미확정 사항을 분리해 기록한다.

## Scope

- 디자인 산출물, 실제 사용자 과제 QA, 디자인 최종 보고, 독립 검토, 장애 조사 결과의 인수 상태를 대조한다.
- Orca app, orchestration runtime, terminal session, provider worker, Git/worktree 계층의 관측을 분리한다.
- 독립 조사자가 남긴 보고서가 없음을 명시하고 지휘자 대체 조사 보고서를 별도 provenance로 남긴다.
- 재시작·재고용·중복 쓰기 없이 안전한 다음 복구 게이트를 정한다.
- 현재 제품 방향과 디자인 후보의 승격 조건을 한 장의 인수 보고로 정합한다.

## Non-Scope

- Orca 재시작·강제 종료·DB 수정·worktree 삭제
- 디자인 시안·제품 코드·Agent Kit 수정
- 독립 QA 또는 실제 사용자 과제의 결과를 대신 생성
- 원인 미확정 상태에서 Orca나 Claude Code를 단일 원인으로 확정
- 전역 설치, commit·push·PR, release·publish

## Completion Check

- [x] 디자인팀 인수 보고서가 각 산출물을 `수신/부분/미수신`으로 구분한다.
- [x] 런타임 사고 보고서가 영향, 심각도, 타임라인, 다섯 실패 계층, 관측·가설·미확정 사항을 포함한다.
- [x] 독립 QA의 Orca Task result와 조사 실패를 worktree 파일 유무와 혼동하지 않는다.
- [x] 지휘자 RPC 실패의 직접 원인과 앱 재시작·Git 오류의 미확정 원인을 분리하고 각각 확신도와 반증 조건을 적는다.
- [x] 재시작·재고용 없는 안전 복구 순서와 다음 사람 게이트가 명시된다.
- [x] 결정론 문서 검사와 `git diff --check`가 통과한다.

## Forbidden

- terminal exit 또는 `worker_done` 하나만으로 작업 완료 판정
- 상관관계만으로 `spawn git ENOENT`를 runtime 장애의 확정 원인으로 표기
- 보고서가 없는 독립 검토·장애 조사를 완료로 표기
- 개인 절대경로, 시크릿, credential 값 기록
- 미완료 디자인 후보를 production handoff로 승격

## Evidence Plan

- `docs/operations/reports/2026-08-23/design-team-intake-status.md`
- `docs/operations/reports/2026-08-23/orca-runtime-incident.md`
- 디자인·검토·조사 worktree의 read-only Git 상태와 기존 QA 영수증
- Orca status, 실제 orchestration RPC, terminal trace의 비밀값 제외 관측
- `scripts/check-goal-17.mjs`와 `git diff --check`

## Evidence

- `docs/operations/reports/2026-08-23/design-team-intake-status.md`: 디자인 기술 QA, 사용자 5과제, 최종 보고, 독립 QA `BLOCKED`, 조사 Dispatch 실패, Orca 전달을 `수신/부분/미수신/실패`로 분리했다. 회수한 P0 1건·P1 6건과 검토 절차 위반을 기록했다.
- `docs/operations/reports/2026-08-23/orca-runtime-incident.md`: SEV3 영향, KST 타임라인, 다섯 실패 계층, 신원별 A/B RPC, 조사 provider 미기동, Git 실패 통계, 재시작 없는 복구 게이트를 기록했다. 독립 조사 결과가 아니라 지휘자 대체 조사임을 명시했다.
- 디자인 worktree read-only 감사: ref `4688b826` 이후 수정 파일 6개와 미추적 계약 문서 2개, 기술 QA pass, 실제 사용자 과제 `not run`을 확인했다.
- Orca Task 정본 감사: 독립 QA Task `task_1d9a49c4101b`의 completed worker report에서 `BLOCKED — P0 1건, P1 6건`을 회수했다. target worktree 무수정은 read-only 계약과 일치하나 Playwright MCP 부산물 2개가 남은 절차 위반을 분리했다.
- 조사 Dispatch 감사: `ctx_0cec168cfa58`의 effective agent·model·effort가 null, heartbeat·report 없음, `stop_unverified` failed를 확인했다.
- 신원별 A/B 재현: `CodexSandboxOffline`의 `run-list`는 `runtime_unavailable`, sandbox 밖 동일 명령은 같은 runtime ID로 성공했다. Orca 공개 #13539와 같은 named-pipe 권한 결함으로 지휘자 RPC 실패의 직접 원인을 높은 확신도로 분리했다.
- main trace 통계: Git 호출 9,857건 중 ENOENT 5,375건·성공 3,777건, ENOENT 첫 시각 10:36 KST로 12:51 재시작보다 앞섰다. 앱 재시작과 Git 오류의 근본 인과는 미확정으로 유지했다.
- `scripts/check-goal-17.mjs`: 보고서 존재, 독립 QA 차단 판정, 조사 provider 미기동, sandbox 권한 A/B, 앱 재시작 원인 미확정, 확신도·반증·중복 방지, 개인 절대경로 부재를 결정론적으로 검사한다.
- `npm.cmd run vhk -- goal check --id 17 --force`: typecheck·lint·test·build와 Goal 17 전용 검사가 모두 PASS. 첫 build의 Google Fonts 네트워크 차단은 네트워크 허용 동일 명령에서 해소됐다.
- `git diff --check -- goals/17-design-team-intake-and-runtime-incident.md scripts/check-goal-17.mjs docs/operations/reports/2026-08-23 docs/log/2026-08-23-design-team-intake-and-runtime-incident.md docs/state/next-task.md`: PASS. 기존 `next-task.md`의 LF→CRLF 경고만 있었고 whitespace error는 없었다.
- `docs/log/2026-08-23-design-team-intake-and-runtime-incident.md`: 인수 판정, 사고 조사, 안전 복구, 검증 기록.
