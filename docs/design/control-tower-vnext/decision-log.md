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

## 2026-08-22 — 3안을 기본 시각 방향으로 선택

- Status: approved
- Decider: 사용자
- Options considered: 1안 Focus Runway / 2안 지식 관계 중심 / 3안 혼합형 운영 목록
- Decision and rationale: 3안의 어두운 셸과 밝은 작업면, 행 중심 밀도, 명확한 항목·도구 아이콘이 가장 취향에 맞는다. 2안의 문서 근거와 관계 표현은 3안에 결합한다.
- Evidence: 사용자 선택, `exec-d599fab4-900f-4d40-aff9-39c26a9a8d51.png`, `exec-445faf85-6523-4ed1-94c0-a7a2bb737fd1.png`
- Consequences: 세 방향 탐색은 종료하고 한 방향을 다듬는다. production UI는 수정 시안과 상세 명세를 사용자가 다시 확인하기 전까지 수정하지 않는다.
- Revisit trigger: 수정 시안에서 밀도·가독성·관계 탐색이 함께 성립하지 않을 때

## 2026-08-22 — 작업 맥락을 관계형 검사 열로 재설계

- Status: approved
- Decider: 사용자
- Options considered: overlay drawer / 고정 상세 카드 / 본문과 정렬된 관계형 검사 열
- Decision and rationale: 기존 우측 패널의 위·좌 여백과 떠 있는 느낌이 어색하므로 페이지 헤더부터 본문까지 같은 그리드에 붙인다. 에이전트·스킬의 전체 컨텍스트를 노출하는 대신 역할, 사용 스킬, 참조 문서, 최근 근거, 관련 일정만 간결하게 보여준다.
- Evidence: 사용자 주석 이미지 `codex-clipboard-uNqrNF.png`, `docs/design/control-tower-vnext/design-spec.md`
- Consequences: 스킬, 문서, 디자인 지식, 일정이 동일한 선택·역링크 규칙을 공유한다. 숨겨야 하는 프롬프트·시크릿·설정은 UI 데이터 계약에서 제외한다.
- Revisit trigger: 360px 검사 열에서 여섯 역할과 관계 경로가 과밀하거나, 본문 표가 1280px에서 핵심 열을 잃을 때
