# 요한 생태계 계약 감사 — 2026-08-07

> 목적: Home MVP를 기존 합의와 저장소 계약에 대조해 확정 사항, 회색지대, 누락, 비범위를 구분한다. 이 문서는 새 정본이 아니라 현재 상태를 보여주는 감사 기록이다. 규칙 변경은 `RULES.md`, 기능 단계 변경은 `docs/PRD.md`, 생태계 역할 변경은 brain의 `ecosystem-contract.yaml`에서 승인해야 한다.

## 결론

Home UI 셸은 `홈 · 프로젝트 · 문서 · 기록 · 벡터` 5탭, Brain 우선, 미연결 상태 명시, 사람 승인 원칙에 맞는다. GitHub Connector로 active 계약 v0.3.0·`projects.yaml` v0.1.1·ADR-013 Accepted를 확인했고, F004 미션 롤업과 F005 드릴다운·F006 정합성 lint를 실제 브라우저로 검증했다. PR은 자동 병합하지 않고 사람 검토를 위한 Draft로 유지한다.

## 역할 계약

| 영역 | 합의된 역할 | 현재 MVP | 판정 |
| --- | --- | --- | --- |
| Control Tower | 사람용 통합 관제·판단·승인 | Home 미션 롤업, 프로젝트 3단 드릴다운, 정합성 제안과 기존 원장 진입점 제공 | 일치 |
| Yohan Brain | 장기 지식·결정·정본 SoT | 문서·Task 집계의 원본, 기존 파일 수정 없음 | 일치 |
| Yohan MCP | AI용 표준 API·행동 인터페이스 | 이름과 연결 상태만 노출, Registry·상태 API 없음 | 부분 |
| VHK | `DEFINE → EXECUTE → VERIFY` 실행·검증 | Goal 2·3 품질 게이트·증거 로그 사용, 다레포 실행 이벤트 집계는 없음 | 부분 |
| Notion | 사람용 Mirror/Registry·모바일 인박스, 정본 아님 | 기존 Notion 벡터 입력 외 Home 역할 미표현 | 부분 |
| Calendar | 약속·시간 배치 | `연결 전`만 명시 | 비범위 |
| Finance | 거래 원장·월간 회고 | `원장 미연결`만 명시 | 비범위 |

## 현재 구현과 계약 대조

### 충족

- 상단 탭은 정확히 5개이며 여섯 번째 탭을 만들지 않았다.
- 기본 진입점을 Home으로 옮겼다.
- 할 일은 기존 `/api/todos`에서 가져오며 가짜 일정·재무·진척 수치를 만들지 않는다.
- Brain 또는 Todo 연결 실패를 `0건`으로 위장하지 않고 확인 필요 상태로 표시한다.
- AI 실행, 캘린더, 재무는 데이터 계약이 없음을 화면에 드러낸다.
- 빠른 메모와 승인 큐는 기존 문서 인박스로 흡수한다.
- Brain 미션 taxonomy와 로컬 Goal을 조인해 프로젝트 커버리지와 Task 상태를 실제 집계한다.
- Home 미션 카드의 선택을 프로젝트 탭에 보존하고 미션→레포→Task를 3단으로 탐색한다.
- 미클론 레포는 Task 0으로 위장하지 않고 `NOT CLONED`, taxonomy 부재는 Setup Required로 구분한다.
- 미배정·미등재·Goal frontmatter 결함을 lint하고 Home에는 actionable 수만 표시한다.
- lint 결과는 읽기 전용 제안이며 Brain·Goal을 자동 수정하지 않는다.
- 디자인은 Warm Cream `#F4F1EA`, Ink `#0A0A0A`, Orange `#FF5C28`의 제한된 신호색과 낮은 카드 밀도를 사용한다.

### 부분 충족

- 미션·프로젝트·Goal 계층은 연결됐지만 AI 완료, 승인 대기 건수, 생태계 블로커 통합은 아직 공통 Run ID 집계 API가 없다.
- Skill 자산은 현재 `rules + templates` 문서 수의 얕은 프록시다. 설치 가능 여부, 버전, 사용 이력, 소유 레포를 보여주는 Skill Registry가 아니다.
- 승인 큐 버튼은 기존 인박스를 연다. 전체 생태계의 승인 대기 항목을 공통 Run ID로 모으는 큐는 아니다.
- 모바일 반응형은 Playwright 390×844로 검증했지만 실제 휴대폰 PWA·터치 동작 검증은 v1 범위 밖이다.

## 선행 게이트 확인 결과

1. **생태계 계약 — 해결**: `ecosystem-contract.yaml` active v0.3.0과 `inheritance-registry.yaml` contract v0.3.0·Control Tower tier A 확인.
2. **미션 taxonomy — 해결**: `memory/core/projects.yaml` active v0.1.1 확인. 부재 시 Setup Required 응답도 테스트로 고정.
3. **Task SoT — 해결**: Accepted ADR-013에 따라 Task는 각 레포 `goals/*.md`, 일정은 Notion·Calendar, Inbox는 수집, 관제탑은 파생 뷰로 확정.
4. **브라우저 QA — 해결**: production Playwright 1440×900·390×844에서 가로 overflow 0, 미션 5개, Home 선택 유지, Task 진행률, 미클론 상태, Home lint 배지, 콘솔 오류 0 확인.

남은 것은 사람의 Draft PR 검토와 머지 판정이다. 배포·자동 머지는 수행하지 않는다.

## 회색지대와 결정 질문

| 우선순위 | 회색지대 | 결정이 필요한 내용 |
| --- | --- | --- |
| P0 | System Registry 정본 | 레포·도구·MCP·Skill의 ID, 소유자, 경로, 상태, 버전을 어디에 기록할지 |
| P1 | 공통 AI 실행 추적 | Run ID, Context, Result, Eval, Approval, Rollback의 최소 스키마와 보존 위치 |
| P1 | Skill 보관소 | 문서형 규칙과 실행 가능한 Skill을 같은 Registry에 둘지 분리할지 |
| P1 | Finance 원장 | CSV/수동 입력/은행 연동 중 최초 입력 계약, 중복 제거 키, 카테고리 수정 이력 |
| P1 | 모바일·PWA | Tailscale 전용인지 설치형 PWA인지, 반복 일정과 알림을 누가 실행할지 |
| P2 | Notion 리모델링 | Mirror/Registry/Inbox만 남길 때 보존할 DB와 읽기 전용 전환 순서 |

## 명시적 비범위

- 일정 337행 마이그레이션, 반복 규칙, OS/PWA 알림
- 재무 거래 입력·분류·월간 회고 계산
- 다레포 VHK 이벤트·MCP 서버·Skill Registry 집계
- Notion 전체 워크스페이스 리모델링과 데이터 이동
- 자동 승인, 기존 Brain 파일 수정, main 직접 push

## 권장 다음 순서

1. Draft PR에서 Home·미션 드릴다운·정합성 제안·기본 Light 디자인을 사람 눈으로 검토한다.
2. 이후 Calendar 또는 Skill Registry 중 하나만 선택한다. Finance는 거래 원장 계약 뒤에 시작한다.
3. 실제 휴대폰 PWA·터치·알림은 별도 Goal에서 검증한다.
