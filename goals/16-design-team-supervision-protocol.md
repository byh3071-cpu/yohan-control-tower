---
vhk_format: 1
type: goal
id: 16
title: 디자인팀 감독·검토·장애조사의 재시작 안전 운영 계약
status: DONE
priority: P0
completed: 2026-08-23
---

# Goal 16: 디자인팀 감독·검토·장애조사의 재시작 안전 운영 계약

## Objective

지휘자, 디자인팀, 독립 검토자, 장애 조사자가 같은 업무 상태와 증거를 기준으로 소통하고, Orca 런타임이 재시작되거나 보고 이벤트가 유실돼도 중복 작업 없이 인수할 수 있는 운영 매뉴얼과 스킬 요구사항을 고정한다.

## Scope

- 현재 디자인·QA·장애조사 산출물의 인수 상태를 사실과 추론으로 구분한다.
- 지휘자·디자인팀·독립 검토자·장애 조사자의 권한, 입력, 출력, 완료 조건을 정한다.
- Orca 전달과 프로젝트 소유 보고서의 이중 영수증, 재시작 후 재결합, 중복 실행 방지 규칙을 정한다.
- 디자인 결과와 현재 관제탑 구현 방향을 하나의 사람 결정 게이트로 정합한다.
- 반복 운영에 필요한 스킬을 분리하고 기존 `design-team`·`orchestration`과의 조합 경계를 정한다.

## Non-Scope

- Orca 재시작·복구 실행 또는 런타임 코드 수정
- 디자인 시안·제품 코드 수정
- 전역 스킬 생성·설치·배포
- 디자인 결과 승인, PR Ready 전환, merge, 배포

## Completion Check

- [x] 운영 매뉴얼에 정상 흐름, 보고 계약, 재시작 복구, 장애 에스컬레이션, 사람 게이트가 명시된다.
- [x] 현재 지휘자·디자인팀·검토자·조사자의 할 일과 인수 상태가 한 표에서 정합된다.
- [x] 보고서가 도착하지 않은 상태를 완료로 오인하지 않는 판정 규칙이 명시된다.
- [x] 필요한 스킬이 책임별로 분리되고 각 스킬의 입력·출력·금지사항·완료 조건이 정의된다.
- [x] 현재 Orca 관측에 대해 관측 사실, 원인 가설, 미확정 사항이 분리된다.
- [x] `git diff --check`와 문서 링크 검사가 통과한다.

## Forbidden

- 근거 없이 Claude Code 또는 Orca 재시작을 단일 원인으로 확정
- Orca 외부에서 실행된 작업을 사후에 orchestrated 작업으로 표기
- 전달 이벤트만으로 산출물 완료를 인정하거나, 산출물 파일만 보고 worker 생명주기 종료를 추정
- 런타임 장애 중 같은 역할자를 즉시 재고용해 중복 쓰기 발생
- 비밀 값·인증 파일·개인 원문을 장애 보고서에 기록

## Evidence Plan

- `docs/operations/design-team-supervision-runbook.md`
- `docs/operations/supervised-session-skill-requirements.md`
- 현재 디자인 작업공간의 QA 영수증과 Git 상태
- Orca status·terminal daemon·trace 로그의 비밀값 제외 관측
- `git diff --check`와 로컬 링크 존재 검사

## Evidence

- `docs/operations/design-team-supervision-runbook.md`: 현재 인수 상태, 방향 정합, 역할, 이중 영수증, 정상 운영, 재시작 복구, 역할별 다음 일을 기록했다.
- `docs/operations/supervised-session-skill-requirements.md`: 기존 스킬 2종과 신규 스킬 3종의 책임 경계, 입출력, 금지사항, acceptance test, 구현 우선순위를 기록했다.
- `scripts/check-goal-16.mjs`: 두 문서의 존재, 보고·재시작 계약, 역할별 할 일, 스킬 3종, 개인 절대경로 미포함을 결정론적으로 검사한다.
- 디자인 worktree의 `docs/prototypes/control-tower-asset-validation/design-qa.md`: 기술 QA pass와 실제 사용자 과제 `not run`, 미추적 계약 문서 상태를 확인했다.
- 2026-08-23 Orca read-only 점검: app·daemon 생존, runtime `starting/reachable false`, 일시 `ready` 뒤 Run·Task·Inbox·Terminal 조회 `runtime_unavailable`, 디자인 terminal exit code 1, 반복 `spawn git ENOENT`를 관측했다. 직접 인과는 미확정으로 유지했다.
- `npm.cmd run vhk -- goal check --id 16 --force`: typecheck·lint·test·build와 Goal 16 전용 문서 검사가 모두 PASS. 첫 build의 Google Fonts 네트워크 차단은 네트워크 허용 동일 명령에서 해소됐다.
- `git diff --check -- docs/operations goals/16-design-team-supervision-protocol.md scripts/check-goal-16.mjs docs/state/next-task.md`: PASS.
- `docs/log/2026-08-23-design-team-supervision-protocol.md`: 이번 운영 정합과 검증 기록.
