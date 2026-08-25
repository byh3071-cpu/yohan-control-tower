# 지금 화면 정보 구조 — R1 기각, R2 교정, R3 감축

- State: R1 A/B/C rejected · NOW-R2 superseded · NOW-R3 approved
- Revision: NOW-IA-R1 rejected / NOW-R2 superseded / NOW-R3 selected
- Prepared: 2026-08-23 (Asia/Seoul)
- Viewport: 1440×1024 only
- Visual basis: Candidate A
- Production UI authorization: 없음
- Source ref at preparation: 46da6ea

## 2026-08-24 — R3 표준 작업 언어와 감축 결과

공식 제품 문서를 교차 확인한 결과, `Ticket`은 보편적인 계층명이 아니다. Jira는 Epic 아래 Story·Task·Bug와 Subtask를 두고, Linear는 Initiative·Project·Issue·Sub-issue를 사용하며, GitHub Issue는 작업·버그·기능과 하위 이슈를 추적한다. 관제탑은 제품 간 차이를 억지로 평탄화하지 않고 프로젝트 규칙에 맞는 다음 모델을 사용한다.

```text
Phase  단계·결과 묶음
  └─ Goal  단독 검증 가능한 완료 결과
       └─ Task  현재 실행하는 원자 행동

Issue  장기 추적·외부 협업·크로스레포 의존이 있을 때 Goal 또는 Task에 연결
```

| 용어 | 정본 의미 | 화면 규칙 |
| --- | --- | --- |
| Phase | 여러 Goal이 모이는 사용자 결과 단계 | 명시된 실제 이름이 있을 때만 조용한 맥락으로 표시 |
| Goal | 단독 검증·완료 가능한 한 가지 결과 | 안정적인 ID와 완료 결과명 한 줄 표시 |
| Task | 현재 실행하는 참·거짓 Completion Check | 화면의 유일한 큰 제목과 핵심 행동을 소유 |
| Issue | 별도 추적이 필요한 문제·의존·협업 기록 | 연결된 실제 이슈가 있을 때만 `이슈 #번호`로 표시 |

R3 감축:

- 같은 Task를 제목과 카드에서 반복하던 구조 제거
- 실행 화면에 상시 노출하던 용어집·정의 카드 제거
- 실제 연결이 없는 Issue·담당자·기한 영역 제거
- Goal 중복 표기 제거
- 검토 행동을 하나의 44px 버튼으로 통합
- 현재 Task, 상태, 완료 기준, 출처, NEXT만 남김

- Language contract: `docs/design/control-tower-vnext/work-item-language-contract.md`
- Native source: `docs/prototypes/control-tower-now-mova-r3/index.html`
- Target render: `docs/prototypes/control-tower-now-mova-r3/now-mova-r3-1440.png`
- Production UI authorization: 없음
- User gate: 완료 · 2026-08-24 사용자 승인

### NOW-R3 검증 영수증

| Check | Threshold | Reading | Verdict |
| --- | --- | --- | --- |
| 실제 렌더 | 1440×1024 | 1440×1024 | pass |
| 가로·세로 overflow | 0px | 0px / 0px | pass |
| 현재 Task 제목 | 정확히 1개 | H1 1개, 한 줄 | pass |
| 핵심 행동 | 1개 | 버튼 1개 | pass |
| 핵심 행동 높이 | 44px 이상 | 44px | pass |
| visible text | 14px 이상 | min 14px / max 54px | pass |
| 빈 Issue 영역 | 0개 | 0개 | pass |
| console·page error | 0 | 0 | pass |

- PNG SHA-256: `DEAD4032E55E5D72ADC24E7A17AB75631BEC27DBD924A9B0086B70B733B2B3DD`
- Adversarial residual risk: `Phase`는 현재 Goal 21에서 실제 VHK 일급 객체가 아니라 사용자 결과 묶음이므로, production 데이터에서 명시적 Phase가 없을 때 화면이 임의로 이름을 만들면 안 된다. R3는 시각 방향 검토용 fixture이며 production 구현 승인은 아니다.

## 2026-08-24 — R2 재구성 기준

R1 세 안은 모두 기각됐다. 공통 실패는 승인·예외·근거를 동급 정보로 나열하고 `이어가기 중심 / 승인 중심 / 예외 중심`이라는 화면 관점으로 이름을 붙여, 실제 Phase·Goal·Task와 지금 행동을 다시 해석하게 만든 점이다. 기술 검증 통과는 이 정보 구조 실패를 반박하지 못한다.

NOW-R2는 사용자가 승인 기준으로 다시 지목한 MOVA 작업 화면을 다음과 같이 옮긴다.

| 고정 용어 | 화면 의미 | 표시 문법 |
| --- | --- | --- |
| Phase | 여러 Goal이 모여 만드는 사용자 결과 묶음 | `PHASE` 작은 레이블 + 한국어 결과명 한 줄 |
| Goal | 단독으로 검증하고 완료할 한 가지 결과 | `GOAL <id>` + 한국어 완료 결과명 한 줄 |
| Task | 지금 실행하는 참·거짓 원자 행동 | `TASK <현재>/<전체>` + 동사·목적어 한 줄 |

규칙:

1. 화면 첫 큰 문장은 현재 Task와 필요한 결정을 직접 말한다.
2. 한 행에는 객체 하나, 상태 하나, 핵심 행동 하나만 둔다.
3. Phase와 Goal은 Task의 맥락이고, Task만 현재 시선을 소유한다.
4. `NEXT`는 현재 Task 완료 뒤 행동, `ALWAYS`는 작업 중 지켜야 할 불변식만 표시한다.
5. 영어는 분류 레이블에만 쓰고 실제 이름과 행동은 한국어 한 줄로 쓴다.
6. 상태·근거·승인·예외를 별도 동급 카드로 증식시키지 않는다. 현재 Task를 막을 때만 주 상태로 승격한다.

- Native source: `docs/prototypes/control-tower-now-mova-r2/index.html`
- Target render: `docs/prototypes/control-tower-now-mova-r2/now-mova-r2-1440.png`
- Production UI authorization: 없음
- User gate: 종료 · R3로 대체

### NOW-R2 검증 영수증

| Check | Threshold | Reading | Verdict |
| --- | --- | --- | --- |
| 실제 렌더 | 1440×1024 | 1440×1024 | pass |
| 가로·세로 overflow | 0px | 0px / 0px | pass |
| 작업 계층 | Phase→Goal→Task 순서 | `PHASE / GOAL 15 / TASK 4/5` | pass |
| 현재 핵심 행동 | 1개 | `검토 결과 남기기` 1개 | pass |
| 핵심 행동 높이 | 44px 이상 | 44px | pass |
| visible text | 14px 이상 | min 14px / max 52px | pass |
| 본문·보조 대비 | 4.5:1 이상 | 13.51:1 / 5.28:1 / 5.95:1 | pass |
| 버튼 대비 | 4.5:1 이상 | 5.83:1 | pass |
| console·page error | 0 | 0 | pass |

- PNG SHA-256: `D04E52F676842E0A9447C3056FC25058223F463BA9B6D4A4A88DF7F1AB192BDF`
- Adversarial residual risk: 현재 fixture의 Task는 디자인 검토라 명확하지만, 실제 데이터에서 긴 Phase·Goal·Task 이름이 들어올 때의 축약 규칙과 빈·막힘 상태는 방향 승인 뒤에 별도 검증해야 한다.

## 핵심 job

> 지금 이어갈 한 가지와 내가 승인하거나 풀어야 할 예외를, 근거·갱신 상태와 함께 한 화면에서 결정한다.

이 문장은 이번 세 안에서 바꾸지 않는 구조 기준이다. 이어가기, 승인, 예외를 모두 포함하되 어느 것이 첫 시선을 소유하는지만 A·B·C에서 다르게 설계했다.

근거:

- Observed — 저장소 규칙은 Home이 “지금 뭐 하나”에만 답하는 한 화면이어야 한다고 정한다.
- Observed — 현재 Home은 상위 할 일, 승인 큐 진입, 연결 오류, Calendar, 미션을 이미 다루지만 동급 신호가 많다.
- Observed — Goal 21의 다음 Completion Check는 사용자가 방향을 선택하거나 조합·재생성을 명시하는 것이다.
- Observed — 현재 VHK에는 Goal 13과 15가 함께 IN_PROGRESS이고 goal peek은 13을 가리킨다.
- Inferred — 한 가지 행동과 승인·예외를 같은 판단 문장 안에 두어야 재개 속도와 안전 경계를 함께 지킬 수 있다.

## 기존 Home 요소 감축

사용 빈도 로그가 없으므로 아래 분류는 삭제 승인이 아니라 기본 노출 제안이다. “기본 화면에는 불필요”는 기능 삭제가 아니라 소유 화면이나 명령 팔레트로 이동한다는 뜻이다.

### 항상 필요

| 기존 요소 | 새 역할 | 근거 |
| --- | --- | --- |
| 오늘의 관제탑 제목·날짜 | 지금 제목, 기준일, source freshness | 판단의 시간·근거 경계를 고정한다. |
| 상위 세 할 일 | 이어갈 한 가지와 다음 Completion Check | 전체 목록은 작업 > 할 일이 소유한다. |
| 승인 큐 열기 | 승인 제목·영향·근거를 직접 표시 | 어떤 결정이 기다리는지 먼저 보여야 한다. |
| 할 일 오류·누락 경로·dashboard 오류·정합성 배지 | 행동을 막거나 포인터를 흐리는 예외로 병합 | 정상일 때 숨기고 발생 시 원인·영향·현재 경계를 함께 보여준다. |
| Calendar 진입 단서 | 오늘 일정 요약 또는 확인 전 상태 한 줄 | 시간 제약은 지금 결정을 바꿀 수 있다. |

### 가끔 필요

| 기존 요소 | 새 역할 | 근거 |
| --- | --- | --- |
| 빠른 메모 | 전역 capture/command 진입 | 어느 화면에서나 필요하지만 Home 본문의 주인공은 아니다. |
| 할 일 전체 수·전체 보기 | 작업 > 할 일 링크 | 총량보다 다음 Check가 중요하다. |
| 미션 지도 | 한 줄 미션 지평선 | 작업의 이유를 연결하지만 매번 다섯 카드가 필요하지 않다. |
| 로컬 프로젝트 coverage·정합성 상세 | 예외 또는 선택 항목 검사 열 | 행동에 영향을 줄 때만 노출한다. |
| 전체 Calendar | 작업 > 일정 | Home 기본 모드로 전환하지 않는다. |

### 기본 화면에는 불필요

| 기존 요소 | 이동 또는 제거 이유 |
| --- | --- |
| 개요 / 캘린더 Home 모드 전환 | 전체 일정은 작업 > 일정이 소유한다. |
| 지식 문서 수·status 미기입 수 | 지식·디자인 또는 운영 기록으로 이동한다. |
| Skill 자산 수·규칙/템플릿 집계 | 스킬·도구가 소유한다. |
| 누적 ingest 수·배치 정상 장식 | 운영 기록 또는 연결 관리가 소유한다. |
| AI 실행 추적 · 설계 대기, 재무 원장 · 연결 대기 | 구현되지 않은 미래 상태를 기본 Home에 두지 않는다. |
| Calendar · Home에서 사용 신호 행 | 오늘 일정 요약과 중복된다. |
| 다섯 미션 카드와 반복 진입 문구 | 한 줄 지평선으로 압축하고 상세는 프로젝트로 보낸다. |
| 하단 Calendar 홍보 문구 | 작업 > 일정 진입과 중복된다. |
| 정상 여부만 보여주는 상시 상태 점 | 문제가 없으면 숨기고 확인 필요 시 텍스트·아이콘으로 표시한다. |

## 공통 비교 조건

- 1440×1024와 같은 예시 데이터
- 왼쪽 216px / 중앙 904px / 오른쪽 320px의 Candidate A 셸
- 같은 팔레트와 타입 위계
- 같은 선택 항목 Goal 21
- 같은 승인 항목 Goal 21 정보 구조 선택, Goal 13 실제 항목 승인
- 같은 예외 Goal 13·15 동시 IN_PROGRESS
- 같은 일정 상태 Calendar 원장 확인 전
- 모든 안에 예시 데이터 지속 표시
- 사용자 선택 전 360px과 production 구현은 만들지 않음

## Option A — 이어가기 중심

- Thesis: 재개할 한 Goal과 다음 Completion Check를 가장 크게 둔다.
- Workflow: 이어갈 일 → 다음 Check → 승인·예외 → 우측 근거.
- Structure: focus runway → 승인/예외 2열 → 일정/미션 보조 rail.
- Strength: 중단 뒤 현재 흐름으로 가장 빨리 복귀한다.
- Failure mode: 승인 비용이 큰 날에도 승인이 두 번째 위계로 밀릴 수 있다.
- Complexity: 중간. 하나의 우선 작업을 고르는 계약이 필요하다.
- Still to validate: 여러 active Goal 중 이어갈 한 가지를 고르는 기준.
- HTML: docs/prototypes/control-tower-now-options/index.html?option=a
- Render: docs/prototypes/control-tower-now-options/now-option-a-focus-runway-r1.png
- Revision: NOW-IA-R1/A
- PNG SHA-256: 7C555BA347D03D7C91871C4CB6F67D193458B0CF2939A4CFB51BC913B2DB3CEF

## Option B — 승인 중심

- Thesis: 사람 판단을 기다리는 결정을 impact·source가 있는 ledger로 먼저 끝낸다.
- Workflow: 결정 비교 → 영향·쓰기 경계 → 선택 → 이어갈 일.
- Structure: decision ledger → 현재 작업 strip → 예외/일정 → 접힌 미션 맥락.
- Strength: AI 제안·Brain 쓰기처럼 승인 경계가 중요한 날에 오판을 줄인다.
- Failure mode: 승인 항목이 없는 날에는 Home이 inbox처럼 느껴질 수 있다.
- Complexity: 중간 이상. 영향·쓰기 여부·근거 필드가 필요하다.
- Still to validate: 디자인 선택과 운영 승인의 위험도가 충분히 구분되는지.
- HTML: docs/prototypes/control-tower-now-options/index.html?option=b
- Render: docs/prototypes/control-tower-now-options/now-option-b-decision-ledger-r1.png
- Revision: NOW-IA-R1/B
- PNG SHA-256: 225D33D77E36F98AE7EC080873621F68151A7E8CD52710C311D1932442D40181

## Option C — 예외 중심

- Thesis: 충돌·미확인 상태의 원인, 영향, 현재 경계를 먼저 분리한다.
- Workflow: 예외 관찰 → 영향 → 허용 경계 → 예외와 무관한 일 계속.
- Structure: exception diagnosis → 관찰/영향/경계 3열 → 계속할 일/결정 대기.
- Strength: stale·unknown·source unavailable을 정상 운영 상태로 다룬다.
- Failure mode: 낮은 심각도의 예외가 잦으면 실제 작업보다 경고가 더 크게 보일 수 있다.
- Complexity: 높음. 예외의 영향과 허용 행동을 정규화해야 한다.
- Still to validate: Home 첫 위계를 차지할 severity 기준.
- HTML: docs/prototypes/control-tower-now-options/index.html?option=c
- Render: docs/prototypes/control-tower-now-options/now-option-c-exception-sweep-r1.png
- Revision: NOW-IA-R1/C
- PNG SHA-256: 0FE7C700FD0535DDEC80EC8A624BB63A4DF10452B9EA1A953C64057925212B40

## 검증 영수증

| Check | Threshold | Reading | Verdict |
| --- | --- | --- | --- |
| 정확히 세 안 | A·B·C 외 없음 | data-option a/b/c, 화면당 visible option 1 | pass |
| 실제 렌더 | 1440×1024 | PNG 3개 모두 1440×1024 | pass |
| 같은 비교 조건 | shell·fixture·선택 동일 | 216 / 904 / 320px, Goal 21 선택 | pass |
| overflow | 0px | A·B·C 가로·세로 0px | pass |
| 타입 | visible 14px 이상, H1 24/32px | min 14px, max 24px, H1 24/32px | pass |
| target | CSS min-height 44px | computed 44px, rendered 43.99px | pass |
| 패널 시작선 | main·inspector 동일 | 둘 다 55.994px | pass |
| 본문 대비 | 4.5:1 | ink 15.23:1, slate 5.95:1 | pass |
| 의미색 대비 | focus 3:1, text 4.5:1 | 5.52:1, 5.11:1, 4.85:1 | pass |
| 금지 용어 | 0 | 0 | pass |
| 선택 파란 왼쪽 edge | 0px | Option B 0px | pass |
| 굵은 큰 제목 반복 | 20px 이상 4개 미만 | A 2 · B 1 · C 2 | pass |
| 예시 데이터 표식 | 항상 visible | A·B·C true | pass |
| console·page error | 0 | 0 · 0 | pass |
| gate calibration | 고의 broken sample 탐지 | true | pass |

1px hairline은 비의미 구획선이며 상태 전달에 사용하지 않는다. 이번 범위는 static IA 렌더이므로 live data, 사용자 과제 시간·오답률, production 키보드 행동, 360px은 검증하지 않았다.

## Resource guard 영수증

- Guard 전 측정: RAM 여유 9.34GB / 29.6%, 작업 드라이브 여유 310.09GB.
- 사용자 중단 신호: host commit 91.99%, current rollout 약 168MB.
- 조치: 기존 세 렌더와 측정만 문서화하고 추가 브라우저 반복·새 옵션·360px·src·commit·push를 중단한다.

## 남은 위험

1. 사용 빈도 로그가 없어 Home 분류는 정보구조 제안이지 삭제 근거가 아니다.
2. Goal 13과 15가 동시에 IN_PROGRESS라 active Goal 단일성 규칙과 충돌한다.
3. fixture는 실제 프로젝트 문구를 사용하지만 live 데이터가 아니다.
4. Option C는 severity 계약이 없으면 경고가 Home을 과점할 수 있다.
5. 360px은 사용자 선택 뒤에만 만들도록 의도적으로 미검증이다.

## 팀·도구 영수증

| 역할 | 도구 | 범위 | 상태 |
| --- | --- | --- | --- |
| 디자인 지휘·UX·비주얼 | Codex 현재 세션 + design-team | 감축, 세 IA, 사용자 게이트 | 완료 |
| native visual source | 프로젝트 HTML + Lucide React 1.27.0 named icon nodes | 1440px 원본 | 완료 |
| 브라우저 검증 | Playwright MCP · Windows Chromium | 크기·overflow·타입·target·오류·캡처 | 완료 |
| 최종 선택 | 사용자 | NOW-R3 작업 언어·감축 방향 | 완료 |

## R1·R2 사용자 게이트 — 종료

R1 A·B·C는 2026-08-24 모두 기각됐고 NOW-R2는 R3로 대체됐다. `NOW-R3`는 2026-08-24 사용자 승인됐으며, 다음 게이트는 `design-spec.md`에 따른 구현 Goal 범위 승인이다.
