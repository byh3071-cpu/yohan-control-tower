---
vhk_format: 1
type: goal
id: 9
title: VHK 새 세션 연속성과 로컬 실행 표준화
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 9: VHK 새 세션 연속성과 로컬 실행 표준화

## Objective

노트북·집 PC·Claude Code·Codex의 새 세션에서도 기억에 의존하지 않고 저장소 규칙만 읽어 같은 Phase → Goal → Completion Check 흐름으로 안전하게 이어서 작업할 수 있어야 한다.

## Scope

- VHK 2.12.0을 프로젝트 devDependency로 정확히 고정한다.
- 새 세션 시작·작업 분해·검증·종료 절차를 `RULES.md` SoT에 기록하고 `vhk sync`로 파생 규칙에 전파한다.
- `next-task.md`와 `blockers.md`의 실제 상태 관리 의미를 구분하고 upstream 결함 링크를 남긴다.
- 실제 VHK 결함과 환경·사용 오류를 구분해 중복 검색 후 이슈를 등록하는 기준을 고정한다.
- 비밀 값이나 개인 경로를 출력하지 않는 로컬 환경 점검 명령을 제공한다.
- Brain의 configured CORE-RULES 원본을 자동 연결하고, 원본 부재 시 무음 다운그레이드를 차단한다.
- README에 새 PC·새 세션의 최소 실행 순서를 기록한다.

## Completion Check

- [x] `@byh3071/vhk`가 devDependency `2.12.0`으로 정확히 고정된다.
- [x] `npm run vhk -- goal list`가 전역 설치 없이 동작한다.
- [x] RULES에 새 세션 시작 절차와 한 번에 active Goal 하나 원칙이 있다.
- [x] 구현을 Phase → 독립 검증 가능한 Goal → 원자적 Completion Check로 나누는 기준이 있다.
- [x] 큰 작업의 추가 Goal·GitHub Issue 분리 및 VHK 결함 이슈 등록 기준이 있다.
- [x] `next-task.md`는 VHK 관리 스냅샷, `blockers.md`는 append-only임을 명시한다.
- [x] `npm run setup:check`가 경로·VHK 준비 상태를 값 노출 없이 검증한다.
- [x] configured CORE-RULES 원본이 없으면 VHK 규칙 동기화를 안전하게 중단한다.
- [x] README에 새 PC 설치와 새 세션 재개 명령이 있다.
- [x] `vhk sync --check`, typecheck, test, lint, build가 통과한다.

## Forbidden

- `.env.local`, 토큰 또는 개인 절대경로 커밋·출력
- VHK 전역 설치에만 의존
- 환경 오류·명령 오용을 VHK 결함으로 등록
- Completion Check를 검증 없이 체크
- main 직접 push 또는 자동 merge

## Evidence

- `package.json`·`package-lock.json`: `@byh3071/vhk`를 정확히 `2.12.0`으로 고정했고 `npm run vhk -- --version`이 `2.12.0`을 출력했다.
- `RULES.md`: 새 세션 시작, active Goal 하나, Phase → Goal → Completion Check, 큰 단위 분리, 검증·완료, VHK upstream 이슈 기준을 SoT로 기록했다.
- 실제 `vhk sync` 후 `AGENTS.md`와 `CLAUDE.md`에 새 세션 프로토콜이 전파됐고, configured core 원본을 지정한 `vhk sync --check`가 통과했다.
- VHK 생성 규칙과 `goal next`의 상태 문서 모순을 재현하고 중복 검색 후 VHK [#555](https://github.com/byh3071-cpu/vhk/issues/555)를 등록했다.
- 새 환경의 `vhk sync`가 configured v0.1.5 CORE-RULES를 번들 v0.1.0으로 무음 교체하는 문제를 재현하고 중복 검색 후 VHK [#556](https://github.com/byh3071-cpu/vhk/issues/556)을 등록했다.
- `scripts/run-vhk.mjs`: `.env.local`의 Brain core-ruleset을 자동 연결한다. 원본 미설정 `sync --check`는 exit `1`이었고 CORE-RULES 전후 Git blob hash는 `05b5e42528100efe7b616cb2c75ffcc623885e58`로 동일했다.
- `scripts/check-local-setup.mjs`: VHK·Brain·repos·Calendar·Notion 준비 상태를 변수명만으로 표시한다. 환경 미설정은 정확히 실패하고 Goal 게이트의 임시 정상 환경은 경로 노출 없이 통과한다.
- README에 `git pull` → `npm install` → `setup:check` → `vhk context/goal peek/goal list` 재개 절차를 기록했다.
- `vhk verify`: typecheck·lint·test·build·secure scan `5/5 PASS`. `receipt`의 dirty BLOCK과 `preflight`의 로컬 env BLOCK은 커밋 전·샌드박스 환경에 맞는 정상 안전 차단으로 구분했다.
- `vhk doctor`의 AGENTS drift 경고는 기존 TS-001 오탐이며 같은 상태의 `vhk sync --check`는 PASS였다.
- `scripts/check-goal-9.mjs`가 전체 품질 게이트와 새 세션 계약을 재검증한다.
