---
vhk_format: 1
type: goal
id: 11
title: VHK 전체 완료 next-task 인수인계 보정
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 11: VHK 전체 완료 next-task 인수인계 보정

## Objective

모든 Goal이 DONE인 출고 시점에 `goal list`와 `next-task.md`가 모순되지 않아 새 AI 세션이 완료된 Goal을 다시 시작하지 않아야 한다.

## Scope

- VHK 2.12.0의 all-done stale snapshot을 최소 재현하고 upstream 이슈로 추적한다.
- 프로젝트 VHK 래퍼가 성공한 `goal next` 뒤 모든 Goal의 DONE 여부를 검사한다.
- 기존 파일이 VHK 관리 snapshot일 때만 명시적인 전체 완료 snapshot으로 갱신한다.
- RULES·운영 로그·감사·학습에 workaround와 이슈를 기록한다.
- 실제 마지막 Goal 완료 후 `goal next`와 `goal list`가 일치하는지 검증한다.

## Completion Check

- [x] VHK all-done stale snapshot 결함이 upstream 이슈로 등록된다.
- [x] wrapper가 모든 Goal DONE을 판정하는 함수와 snapshot 갱신을 제공한다.
- [x] 수동 작성 next-task는 덮어쓰지 않고 VHK 관리 snapshot만 보정한다.
- [x] RULES와 세션 문서에 VHK #558 및 새 세션 의미가 반영된다.
- [x] 격리 fixture의 all-done 상태에서 완료 snapshot을 기록하고 수동 작성 파일은 보존한다.
- [x] `goal list`의 Goal 1~10은 DONE이고 Goal 11만 active다.
- [x] typecheck, test, lint, build가 통과한다.

## Forbidden

- 수동 작성 `next-task.md` 무조건 덮어쓰기
- VHK 실패 exit code를 성공으로 바꾸기
- Goal 파일의 status 자동 수정
- main 직접 push 또는 자동 merge

## Evidence

- 실제 VHK 2.12.0에서 Goal 1~10이 모두 DONE인데 `goal next`는 완료 메시지만 출력하고 Goal 10 `IN_PROGRESS` next-task를 남겼다.
- open·closed 이슈 중복 검색 후 VHK [#558](https://github.com/byh3071-cpu/vhk/issues/558)에 버전·재현·기대·영향을 등록했다.
- `scripts/run-vhk.mjs`의 `allGoalsDone()`은 숫자 Goal 파일을 모두 읽어 `status: DONE`을 판정한다.
- `writeAllDoneSnapshot()`은 기존 문서에 `via vhk goal next` 관리 마커가 있을 때만 `TASK: 없음 — 모든 Goal 완료`, `status: DONE`을 기록한다.
- 격리 fixture에서 stale IN_PROGRESS VHK snapshot을 완료 상태로 보정했고, 수동 작성 next-task는 함수가 false를 반환하며 byte-for-byte 유지했다.
- `RULES.md`, 파생 `AGENTS.md`·`CLAUDE.md`, BACKLOG, 계약 감사, learnings, 세션 로그에 #558과 workaround를 기록했다.
- `vhk sync --check`가 드리프트 0으로 통과했다.
- `VHK_GATES_SKIP_DEEP=1 node scripts/check-goal-11.mjs`에서 typecheck·lint와 함수·fixture 검증 7개가 통과했고, 완료 체크 전용 항목만 의도대로 실패했다.
- `scripts/check-goal-11.mjs`가 typecheck·lint·test·build와 완료 계약을 재검증한다.
- Goal 11을 DONE 처리한 직후 실제 `npm run vhk -- goal next`와 `goal list`를 다시 실행해 최종 인수인계 상태를 확인한다.
- Goal 11 `DONE` 후 실제 `npm run vhk -- goal next`가 VHK의 “모든 goal 완료” 다음에 `next-task.md 전체 완료 snapshot 보정 — VHK #558`을 출력했다.
- 최종 `docs/state/next-task.md`는 `TASK: 없음 — 모든 Goal 완료`, `status: DONE`이고 `npm run vhk -- goal list`의 Goal 1~11도 모두 DONE으로 일치했다.
