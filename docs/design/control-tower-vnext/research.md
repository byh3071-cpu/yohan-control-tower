# 요한 관제탑 vNext 디자인 조사

## 결론

관제탑 Home은 모든 원장을 축약한 대시보드가 아니라, 오늘의 결정·승인·이어가기·막힘을 한 화면에서 정렬하는 운영 표면이어야 한다. 캡처, 문서 탐색, 프로젝트 계층, 기록, 벡터 진단은 사라지는 것이 아니라 각 소유 화면과 적절한 깊이로 이동한다.

## 제품 구조에서 확인한 사실

1. Brain/Git은 정본이며 관제탑은 여러 정본을 읽어 연결한다. 기존 Brain 파일을 자동 수정할 수 없다.
2. 미션→프로젝트→Goal의 계층과 일정, 지식 검토, 명령 실행은 서로 다른 소유권·완료 의미를 가진다.
3. Home은 현재 이미 `지금 할 일 / 관제 신호 / 미션 지도 / 캘린더 / 빠른 메모`를 담고 있다. 문제는 기능 부족보다 동급 신호가 많다는 점이다.
4. 다섯 상위 탭은 상한에 도달했고 Vector는 사용자 과업보다 인프라 진단 성격이 강하다.
5. 현재 10–13px 중심의 고밀도 표현은 공통 16/14px 읽기 규칙과 충돌한다.
6. 과거 승인 시안의 context peek와 명시적 승격 행동은 여전히 유효하지만 capture-first 기본 상태는 현재 목적과 충돌한다.

## 공식 레퍼런스가 답한 설계 질문

| 질문 | 공식 근거 | 전이할 패턴 | 그대로 가져오지 않을 것 |
| --- | --- | --- | --- |
| 상위 목표와 프로젝트를 어떻게 연결하는가 | [Linear Initiatives](https://linear.app/docs/initiatives) | 목표·상태·우선순위·소유자·최근 업데이트를 한 행에서 연결하고 필요할 때 drill-down | 팀 조직용 다중 사용자 권한 UI |
| 주의를 요구하는 일을 어디에 모으는가 | [Linear Inbox](https://linear.app/docs/inbox) | 행동이 필요한 업데이트를 별도 큐로 모으고 읽음·snooze·필터 제공 | 모든 이벤트를 Home에 알림으로 밀어넣기 |
| 여러 원장의 내 일을 어떻게 한곳에 보여주는가 | [Notion My Tasks](https://www.notion.com/en-gb/help/guides/give-your-to-dos-a-home-with-task-databases) | 원장을 합치지 않고 공통 필드로 개인 작업을 통합 표시 | Notion을 관제탑 정본으로 사용 |
| 같은 데이터를 다른 관점으로 어떻게 보는가 | [GitHub Projects views](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project) | 표·보드·로드맵을 탭 추가가 아니라 view mode로 제공 | Home에 모든 view를 동시에 노출 |
| 폭이 바뀔 때 구조를 어떻게 바꾸는가 | [Material canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview) | breakpoint마다 열과 navigation 역할을 바꾸되 핵심 순서를 유지 | 데스크톱 전체를 축소한 모바일 |
| 조밀한 UI의 클릭·포커스 최소선은 무엇인가 | [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) | 최소 24×24px target 또는 충분한 간격, 뚜렷한 2px급 focus indicator와 3:1 변화 대비 | 작은 글자와 작은 icon button을 밀도라는 이유로 정당화 |

## 정보 감축 결정

| 현재 요소 | 결정 | 이유 / 이동 위치 |
| --- | --- | --- |
| 오늘의 상위 세 할 일 | 유지·재구성 | 단순 Top 3가 아니라 `이어가기 / 승인 / 막힘` 유형과 출처·freshness를 함께 표시 |
| 빠른 메모 | 유지·축소 | 큰 캡처 박스 대신 전역 command/capture bar로 두고 Home의 주인공을 차지하지 않음 |
| 미션 지도 | 유지·압축 | 다섯 미션의 상태·위험·active project만 한 줄 horizon으로 표시; 상세는 Projects |
| 캘린더 Home 전환 | 병합 | 오늘 일정은 Home rail에, 전체 일정은 현재 Home 내부 calendar mode로 유지 |
| 관제 신호 숫자 | 정리 | 설정·경로·approval blocker만 Home에, 문서 수·ingest 수는 Records로 이동 |
| 문서 카테고리 + 빠른 실행 사이드바 | 분리 | 문서 taxonomy는 Documents에, 명령은 command palette에 두어 두 mental model을 분리 |
| Records 차트 | 유지·깊이 이동 | 기본 Home이 아니라 회고·진단 화면에 유지 |
| Vector 상위 탭 | 우선 숨김 | System/Diagnostics 또는 command palette로 이동하되 사용 증거 전 삭제하지 않음 |
| raw vector log / reset | 기본 비노출 | 고위험·인프라 작업이므로 진단 화면의 명시적 고급 모드에서만 노출 |
| 출처 없는 성과·자산 숫자 | 제거 | 사용자가 행동으로 연결할 수 없고 false precision을 만든다 |

## 제안 정보 구조

### 상위 navigation

1. **Home** — 오늘의 결정, 승인, 이어가기, 막힘, 일정, 미션 horizon
2. **Projects** — 미션→프로젝트→Goal→Completion Check drill-down
3. **Documents · Review** — 문서 탐색, capture inbox, Focus Feed 검토, 선택 시 context peek
4. **Records** — 실행 기록, 발행·야간 작업 상태, 회고 차트

Vector와 명령 실행은 **System / Diagnostics** 진입과 command palette로 이동한다. 이는 삭제가 아니라 기본 navigation에서 숨기는 제안이다.

### Home 한 화면의 우선순위

1. 상단 context bar — 현재 기기, 마지막 sync, source freshness, command/capture
2. 주 작업 영역 — `이어갈 1개`와 다음 Completion Check
3. 승인 큐 — 지식 검토·AI 제안·승격처럼 사람 판단이 필요한 항목
4. 막힘 / 오류 — source unavailable, stale, unknown을 정상 상태로 표시
5. 오늘 일정 — 시간이 정해진 일정과 완료할 Goal을 분리
6. 미션 horizon — 다섯 미션의 건강도와 active project만 압축
7. 선택 항목 context peek — 출처·근거·영향·행동을 임시 우측 패널로 표시

## 시각 탐색 프레임

세 방향은 색상만 다른 버전이 아니라 다음 구조적 차이를 비교한다.

- **A. Focus Runway** — 하나의 이어가기 행동을 중앙에 크게 두고 승인·일정·미션을 주변 신호로 배치한다.
- **B. Decision Ledger** — 이어가기·승인·막힘을 조밀한 행 기반 운영 ledger로 정리하고 우측 context peek로 판단한다.
- **C. Mission Horizon** — 다섯 미션과 active project를 상단 horizon으로 두고 오늘의 행동이 그 아래에서 목표와 연결되게 한다.

모든 안은 1440×1024, 동일 데이터와 선택 상태, 16/14px 읽기 기준, 명시적 source/freshness, 고정되지 않은 context peek를 사용한다. 과거 승인 다크와 현재 구현 라이트 토큰을 모두 비교할 수 있도록 기본 테마와 밀도는 방향별로 달리하며, 최종 선택은 사용자에게 남긴다.

## 리스크와 검증

- 사용 빈도 데이터가 없으므로 Vector와 낮은 우선순위 화면은 삭제하지 않고 숨긴다.
- Home의 단일 초점이 승인 큐를 가릴 수 있으므로 세 안에서 `이어가기`와 `승인`의 위계를 다르게 비교한다.
- 16/14px 규칙은 정보량을 줄이지 않으면 한 화면 목표와 충돌하므로, 작은 글자로 해결하지 않고 열·행·단계를 줄인다.
- 모바일은 데스크톱 3열을 축소하지 않고 `결정 → 이어가기 → 막힘 → 일정 → 미션` 순으로 stack한다.

## 팀 영수증

| 역할 | 런타임 / 도구 | 범위 | 상태 |
| --- | --- | --- | --- |
| 디자인 지휘자 | Codex GPT-5.6 Sol xhigh | 맥락 합성, 경계, 산출물 계약 | 진행 중 |
| 생태계·레퍼런스 조사 | Codex GPT-5.6 Luna max + 공식 웹 문서 | read-only 조사 | 완료 |
| 범용 프로세스 | Yohan Agent Kit `design-team` candidate | 2계층 context, 역할·게이트 | 첫 적용 중 |
| 비주얼 디자인 | 내장 ImageGen | 세 실제 시안 | 완료 · 선택 대기 |
| 최종 승인 | 사용자 | 시각 방향·밀도·레이아웃·상호작용 | 대기 |

도구가 노출하지 않은 이미지 백엔드 모델명은 기록하지 않는다.
