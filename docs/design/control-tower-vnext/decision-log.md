# 요한 관제탑 vNext 결정 로그

## 2026-08-22 — 디자인 탐색을 독립 worktree로 분리

- Status: approved
- Decider: 사용자
- Options considered: 현재 구현 세션의 child worker / 별도 top-level 디자인 작업 계보
- Decision and rationale: 디자인 조사·시안·토큰·UX·기술 명세는 `codex/control-tower-design-direction` worktree에서 분리하고, production UI는 선택 전 수정하지 않는다.
- Evidence: 2026-08-22 사용자 요청, `goals/15-control-tower-design-direction.md`
- Consequences: 현재 구현 Goal 13과 파일 상태를 건드리지 않고 디자인 산출물만 프로젝트 Git에 보관한다.
- Revisit trigger: 사용자가 시각 방향을 선택해 구현 단계 진입을 승인할 때

## 2026-08-22 — 범용 Design Team 컨텍스트 방식을 첫 적용

- Status: approved
- Decider: 사용자
- Options considered: 관제탑 전용 고정 프롬프트 / 어떤 프로젝트에도 적용되는 컨텍스트 주도 스킬
- Decision and rationale: 공통 방법은 Agent Kit가, 프로젝트 사실·자산·결정은 각 프로젝트 Git이 소유하는 2계층 구조를 사용한다.
- Evidence: Yohan Agent Kit `skills/design-team/`, `docs/design/control-tower-vnext/design-context.md`
- Consequences: 세션 대화가 없어도 다음 디자인 세션이 근거·충돌·승인 상태를 다시 해석할 수 있다.
- Revisit trigger: 비요한 분야 forward test에서 프로젝트 편향이 확인되거나 프로젝트 컨텍스트가 중복 정본을 만들 때

## Pending — 관제탑 시각 방향

- Status: deferred
- Decider: 사용자
- Options considered: Focus Runway / Decision Ledger / Mission Horizon
- Decision and rationale: 실제 세 시안을 비교한 뒤 기록한다.
- Evidence: `docs/design/control-tower-vnext/research.md`
- Consequences: 선택 전 production UI와 상세 기술 명세는 시작하지 않는다.
- Revisit trigger: 세 방향 시안 제시 직후
