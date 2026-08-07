---
vhk_format: 1
type: goal
id: 12
title: 사용자용 개발 문서 한국어 기본화
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 12: 사용자용 개발 문서 한국어 기본화

## Objective

요한이 직접 읽고 판단해야 하는 GitHub Issue·PR·VHK Goal·Task·세션 인수인계 문서는 한국어만 읽어도 문제와 다음 행동을 이해할 수 있어야 한다.

## Scope

- 이번 작업에서 등록한 VHK #555~#558의 제목과 본문을 한국어로 바꾼다.
- 사용자에게 노출되는 개발·운영 문서의 한국어 우선 원칙을 `RULES.md` SoT에 기록한다.
- VHK sync로 `AGENTS.md`와 `CLAUDE.md`에 같은 규칙을 전파한다.
- 명령어·코드·필드명·고유명사는 기술적 정확성을 위해 원문 영어를 유지할 수 있다.

## Completion Check

- [x] VHK #555~#558의 제목과 본문이 한국어로 갱신된다.
- [x] RULES에 사용자용 Issue·PR·Goal·Task·인수인계 문서의 한국어 기본 원칙이 있다.
- [x] 기술 식별자는 원문을 유지하되 한국어 설명을 제공하는 예외 기준이 있다.
- [x] VHK sync 후 AGENTS와 CLAUDE에 같은 언어 규칙이 반영된다.
- [x] `vhk sync --check`와 Goal 12 계약 검사가 통과한다.

## Forbidden

- 명령어·코드·API 필드명까지 억지로 번역해 실행 가능성을 깨뜨리기
- 영어 원문만 남겨 사용자가 문제를 이해하려면 별도 번역이 필요하게 만들기
- 토큰·개인 경로·비공개 원문을 외부 이슈에 포함하기
- main 직접 push 또는 자동 merge

## Evidence

- VHK [#555](https://github.com/byh3071-cpu/vhk/issues/555), [#556](https://github.com/byh3071-cpu/vhk/issues/556), [#557](https://github.com/byh3071-cpu/vhk/issues/557), [#558](https://github.com/byh3071-cpu/vhk/issues/558)의 제목·본문을 한국어로 갱신했다.
- 각 이슈는 요약·확인 환경·재현 방법·실제 결과·기대 결과·영향을 한국어로 설명한다.
- `RULES.md`의 VHK upstream 이슈 등록 기준에 사용자용 문서 한국어 기본 원칙과 기술 식별자 예외를 추가했다.
- `VHK_RULES_FILE=/tmp/yohan-core-ruleset.yaml npm run vhk -- sync`로 파생 규칙에 전파하고 `sync --check`로 드리프트 0을 확인한다.
- `scripts/check-goal-12.mjs`가 RULES·AGENTS·CLAUDE·Goal의 언어 계약을 검사한다.
