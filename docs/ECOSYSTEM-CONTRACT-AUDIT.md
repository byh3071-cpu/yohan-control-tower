# 요한 생태계 계약 감사 — 2026-08-07

> 목적: Home MVP를 기존 합의와 저장소 계약에 대조해 확정 사항, 회색지대, 누락, 비범위를 구분한다. 이 문서는 새 정본이 아니라 현재 상태를 보여주는 감사 기록이다. 규칙 변경은 `RULES.md`, 기능 단계 변경은 `docs/PRD.md`, 생태계 역할 변경은 brain의 `ecosystem-contract.yaml`에서 승인해야 한다.

## 결론

Home UI 셸은 `홈 · 프로젝트 · 문서 · 기록 · 벡터` 5탭, Brain 우선, 미연결 상태 명시, 사람 승인 원칙에 맞는다. 그러나 현재 체크아웃만으로는 v1.1 착수 선행 게이트 두 개를 검증할 수 없으므로 **병합 가능한 v1.1 완료본이 아니라 Draft MVP**다.

## 역할 계약

| 영역 | 합의된 역할 | 현재 MVP | 판정 |
| --- | --- | --- | --- |
| Control Tower | 사람용 통합 관제·판단·승인 | Home과 기존 4개 원장으로 진입점 제공 | 일치 |
| Yohan Brain | 장기 지식·결정·정본 SoT | 문서·Task 집계의 원본, 기존 파일 수정 없음 | 일치 |
| Yohan MCP | AI용 표준 API·행동 인터페이스 | 이름과 연결 상태만 노출, Registry·상태 API 없음 | 부분 |
| VHK | `DEFINE → EXECUTE → VERIFY` 실행·검증 | Goal 2와 품질 게이트 사용, 다레포 실행 집계 없음 | 부분 |
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
- 디자인은 Warm Cream `#F4F1EA`, Ink `#0A0A0A`, Orange `#FF5C28`의 제한된 신호색과 낮은 카드 밀도를 사용한다.

### 부분 충족

- Home의 핵심은 현재 Task·문서 상태다. 합의된 미션 롤업, 프로젝트 진행, AI 완료, 승인 대기 건수, 블로커 통합은 아직 공통 집계 API가 없다.
- Skill 자산은 현재 `rules + templates` 문서 수의 얕은 프록시다. 설치 가능 여부, 버전, 사용 이력, 소유 레포를 보여주는 Skill Registry가 아니다.
- 승인 큐 버튼은 기존 인박스를 연다. 전체 생태계의 승인 대기 항목을 공통 Run ID로 모으는 큐는 아니다.
- 모바일 반응형 CSS는 구현했지만 실제 기기와 브라우저 시각 검증은 완료하지 못했다.

## 병합 전 차단 항목

1. **생태계 계약 개정 확인** — PRD의 선행 게이트 ①인 `ecosystem-contract.yaml` 역할 개정, `control_tower.must_not: modify_existing_brain_files`, inheritance registry tier 변경은 이 체크아웃에서 검증할 수 없다.
2. **미션 taxonomy 확인** — PRD의 v1.1 선행 게이트 ②인 `projects.yaml`이 있어야 F004·F005·F006을 구현할 수 있다. 없으면 Home은 Setup Required를 보여줘야 한다.
3. **Task SoT 단일화** — 과거 합의의 일정/할일 DB와 현재 PRD의 `<repo>/goals/*.md`가 동시에 Task 정본처럼 읽힌다. `약속=Calendar`, `실행 항목=Goal/Task`, `수집=Inbox` 경계를 정본 문서에서 확정해야 한다.
4. **실제 브라우저 QA** — 프로덕션 빌드는 통과했지만 현재 실행 환경에서 로컬 Next.js 미리보기가 클라우드 브라우저에 연결되지 않았다. 데스크톱·모바일에서 레이아웃과 주요 클릭 흐름을 확인하기 전에는 시각 완료로 판정하지 않는다.

## 회색지대와 결정 질문

| 우선순위 | 회색지대 | 결정이 필요한 내용 |
| --- | --- | --- |
| P0 | System Registry 정본 | 레포·도구·MCP·Skill의 ID, 소유자, 경로, 상태, 버전을 어디에 기록할지 |
| P0 | Task와 Calendar 경계 | 마감일이 있는 Task와 실제 시간 블록·약속의 소유권, 양방향 동기화 여부 |
| P1 | 공통 AI 실행 추적 | Run ID, Context, Result, Eval, Approval, Rollback의 최소 스키마와 보존 위치 |
| P1 | Skill 보관소 | 문서형 규칙과 실행 가능한 Skill을 같은 Registry에 둘지 분리할지 |
| P1 | Finance 원장 | CSV/수동 입력/은행 연동 중 최초 입력 계약, 중복 제거 키, 카테고리 수정 이력 |
| P1 | 모바일·PWA | Tailscale 전용인지 설치형 PWA인지, 반복 일정과 알림을 누가 실행할지 |
| P2 | Notion 리모델링 | Mirror/Registry/Inbox만 남길 때 보존할 DB와 읽기 전용 전환 순서 |

## 명시적 비범위

- F004 미션 집계 API, F005 미션→프로젝트→Task 드릴다운, F006 정합성 lint
- 일정 337행 마이그레이션, 반복 규칙, OS/PWA 알림
- 재무 거래 입력·분류·월간 회고 계산
- 다레포 VHK 이벤트·MCP 서버·Skill Registry 집계
- Notion 전체 워크스페이스 리모델링과 데이터 이동
- 자동 승인, 기존 Brain 파일 수정, main 직접 push

## 권장 다음 순서

1. Draft PR에서 Home 셸과 디자인 방향만 검토한다.
2. brain에서 생태계 계약과 `projects.yaml` 게이트를 확인·승인한다.
3. Task/Calendar/System Registry 세 계약만 먼저 확정한다.
4. F004의 읽기 전용 미션 집계부터 연결해 Home의 임시 카드를 실제 데이터로 교체한다.
5. 이후 Calendar 또는 Skill Registry 중 하나만 세로 슬라이스로 구현한다. Finance는 거래 원장 계약 뒤에 시작한다.
