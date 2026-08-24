# 요한 관제탑 vNext 결정 로그

## 2026-08-24 — 실행 계층과 이슈 추적 객체를 분리

- Status: approved
- Decider: 사용자
- Options considered: `Phase → Goal → Ticket → Task` 단일 계층 / 제품별 용어를 그대로 혼용 / `Phase → Goal → Task` 실행 계층과 조건부 `Issue` 연결
- Decision and rationale: GitHub Issues는 작업·버그·기능을 추적하는 객체이고, Jira 기본 계층은 Epic 아래 Story·Task·Bug와 Subtask를 두며, Linear는 Initiative·Project·Issue·Sub-issue를 구분한다. 따라서 `Ticket`을 모든 제품에 통하는 고정 계층으로 넣는 것은 표준이 아니라 새 조어에 가깝다. 관제탑은 VHK 규칙과 맞는 `Phase → Goal → Task`를 실행 계층으로 고정하고, 장기 추적·외부 협업·크로스레포 의존이 있을 때만 GitHub `Issue`를 Goal 또는 Task에 연결한다. 사용자 화면에서는 `이슈`로 부르고 실제 연결이 없으면 표시하지 않는다.
- Evidence: 2026-08-24 사용자 피드백과 R3 승인(`ㅇㅇ`), `work-item-language-contract.md`, GitHub About Issues, Jira work type hierarchy, Linear conceptual model 공식 문서
- Consequences: NOW-R2의 상시 용어 정의, 중복 현재 Task, 빈 Issue 상태를 제거한 NOW-R3를 선택 방향으로 삼는다. 같은 언어·감축 문법을 다섯 화면 명세에 적용하되 production UI는 별도 구현 Goal 전까지 보류한다.
- Revisit trigger: 실제 운영에서 Goal보다 크거나 Task보다 작은 추적 단위가 반복적으로 필요하고, 기존 Goal·Task·Issue 관계로 표현할 수 없다는 사례가 쌓일 때

## 2026-08-24 — NOW-IA-R1 세 안을 기각하고 MOVA 작업 문법으로 재구성

- Status: rejected · superseded
- Decider: 사용자
- Options considered: A 이어가기 중심 / B 승인 중심 / C 예외 중심 / MOVA 승인 화면의 작업 문법을 적용한 단일 교정안
- Decision and rationale: A·B·C는 배치 우선순위만 바뀌고 무엇을 전달하는 화면인지, 현재 Task가 무엇인지, Phase·Goal 이름이 무엇인지 직접 읽히지 않았다. 사용자는 MOVA처럼 명칭·용어·문장을 통일하고 한 줄로 명확하게 표현하는 방향을 요구했다. 따라서 R1 세 안은 모두 거절 증거로 보존하고, MOVA의 직접적인 큰 제목, 하나의 객체·상태·행동, `NOW/NEXT/ALWAYS` 골격을 `Phase → Goal → Task` 작업 문법에 적용한다.
- Evidence: 2026-08-24 사용자 피드백, `C:/Users/Public/dev/products/mova/docs/design/mova-ade/evidence/viewport-1440.png`, `docs/prototypes/control-tower-now-options/`
- Consequences: Candidate A 셸을 고정 전제로 삼지 않는다. 새 탐색 3안을 만들지 않고 승인된 MOVA 기준을 충실히 적용한 `NOW-R2` 한 안을 먼저 검토한다. production UI는 계속 보류한다.
- Revisit trigger: R2에서도 사용자가 화면 첫 문장만 보고 현재 Task와 다음 행동을 말할 수 없거나, `Phase / Goal / Task` 의미가 섞여 보일 때

## 2026-08-23 — 프로젝트 취향·운영·세션 인수인계 정본을 분리

- Status: approved
- Decider: 사용자
- Options considered: 대화 기록에만 의존 / 범용 스킬에 프로젝트 취향 포함 / 프로젝트 Git에 취향·운영·인수인계 분리
- Decision and rationale: 범용 방법은 Agent Kit `design-team`이, 관제탑 취향·결정·다음 행동은 프로젝트 Git이 소유한다. `taste-profile.md`, `design-operations-manual.md`, `session-handoff.md`를 통해 새 세션이 같은 맥락으로 시작하고 실제 수신 확인까지 남긴다.
- Evidence: 사용자 인수인계 요청, Yohan Agent Kit Goal 14 세션 연속성 계약
- Consequences: 해결된 취향을 새 세션에서 다시 묻지 않고, 전달 성공과 사용자 승인 상태를 분리한다.
- Revisit trigger: 새 세션 forward test가 branch/ref·현재 게이트·다음 행동 중 하나를 복원하지 못할 때

## 2026-08-23 — Candidate A를 다음 화면의 공통 시각 기반으로 사용

- Status: approved · 최종 미감 승인 아님
- Decider: 사용자
- Options considered: 세 방향 재탐색 / Candidate A 기반 다음 화면 정보 구조 탐색
- Decision and rationale: Candidate A는 2안의 간결한 골격·관계 표현과 3안의 행 밀도·아이콘을 Mova 밝은 중립 셸에 결합했고 기술 QA 178/178 및 독립 검수를 통과했다. 따라서 색·셸을 다시 흔들지 않고 `지금` 화면의 정보 구조를 비교한다.
- Evidence: `docs/prototypes/control-tower-asset-validation/audit/browser-qa-results.json`, Claude Code 최종 검수, 사용자 후속 진행 요청
- Consequences: production UI는 계속 보류한다. 목록 밀도와 검사 열 정보 순서는 다음 사용자 게이트에서 확정한다.
- Revisit trigger: `지금` 화면 세 대안에서 공통 셸이 핵심 행동을 방해하거나 사용자가 명시적으로 방향 변경을 요청할 때

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

## 2026-08-22 — 좌측 탐색과 자동화 자산 범위를 다시 탐색

- Status: deferred
- Decider: 사용자
- Options considered: 기존 `지금 / 프로젝트 / 지식·자산 / 스킬·도구 / 운영 기록` / `작업` 중첩형 5영역 / 할 일·일정 각각 최상위
- Decision and rationale: 할 일과 일정을 프로젝트와 별도로 바로 열 수 있어야 한다는 피드백과, 스킬 외 MCP·Hook·Rule·Script 등 전체 자산을 보여야 한다는 피드백을 반영해 정보구조 선택을 다시 연다. 다섯 상위 영역 상한은 유지하고 `작업` 아래 `할 일 / 일정 / 프로젝트`를 형제 보기로 두는 안을 우선 시각화한다.
- Evidence: 2026-08-22 사용자 피드백, Agent Kit canonical catalog 197개, `research-round-2.md`
- Consequences: 이전 5항목 결정은 새 화면군 선택 전까지 production handoff 근거로 사용하지 않는다. `스킬·도구`는 `자동화 자산`으로 확장하고 catalog·가용·검증 상태를 분리한다.
- Revisit trigger: 사용자가 세 화면군에서 좌측 탐색과 자산 facet을 승인·수정·거절할 때

## 2026-08-22 — 자산 종류별 상세와 실행 영수증을 분리

- Status: proposed · 사용자 시각 검토 대기
- Decider: 사용자
- Options considered: 모든 자산에 design-team 역할 카드를 적용 / 공통 머리말 + kind별 상세 렌더러
- Decision and rationale: 두 번째 방식을 다음 시안의 기준으로 삼는다. `Codex`는 역할이 아니라 실행 환경이며, 역할·실행 환경·모델·관리 주체·사용 도구는 서로 다른 개념이다. `design-team`의 역할도 정적 조직도가 아니라 실행마다 동적으로 구성된다.
- Evidence: 사용자 피드백, Agent Kit `asset-catalog.json`, `team-contract.md`, `agent-roster.yaml`, 시니어 개발 도메인 검토
- Consequences: 고정 역할 카드, `Codex` 담당자 표기, 네 개 조어 facet, 197 하드코딩, 모든 종류에 같은 상세 섹션을 적용한 시안은 폐기한다. 다음 시안은 `asset-detail-contract.md`와 `visual-hierarchy-contract.md`를 따른다.
- Revisit trigger: 실제 읽기 모델에서 종류별 필드를 안전하게 만들 수 없거나, 스킬·MCP·훅·플러그인 네 상태의 시각 검증이 실패할 때
