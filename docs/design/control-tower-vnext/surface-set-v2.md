# 요한 관제탑 vNext 화면군 v2

- State: superseded by domain-corrected v3 contract
- Viewport: 1440×1024 desktop
- Visual direction: Mova 밝은 중립 셸 + 종류별 상세 + 제한된 청록 focus
- Purpose: 동일 시스템의 세 핵심 표면을 비교해 정보구조와 밀도를 승인받는다.

## 공통 셸

왼쪽 탐색은 다섯 상위 영역 `지금 / 작업 / 지식·디자인 / 스킬·도구 / 운영 기록`을 사용한다. 데스크톱에서는 `작업` 아래 `할 일 / 일정 / 프로젝트`를 모든 화면에서 항상 보여주며 각각 독립 URL과 선택 상태를 가진다. `작업` 표제는 접기 버튼과 분리한다. 하단에는 `연결 관리`와 `설정`을 두며 정상 상태 문구는 숨긴다.

- App fog: `#E7ECEE`
- Paper surface: `#F7F9F9`
- Primary text: `#172326`
- Muted text: `#526367`
- Hover: `#EEF3F6`
- Selected: `#E7EFF5`
- Focus/current: `#146C94`
- Caution: `#A84F18`
- Radius: controls 8–10px, major layout surfaces square
- Shadows: floating menu·dialog 외 사용하지 않음

실제 구현 아이콘은 Lucide named icon과 검증된 공식 브랜드 asset을 사용한다. 공식 자산이 없으면 유사 로고를 만들지 않고 generic connector icon과 텍스트 이름을 함께 쓴다.

## 화면 A — 작업 · 할 일

핵심 질문은 “오늘 무엇을 끝내고, 언제 시간을 쓸 것인가”다.

- 좌측 `작업` 아래 `할 일` 선택, 형제 `일정 / 프로젝트` 노출.
- 중앙은 `지금 / 오늘 / 예정 / 대기`로 묶은 통합 할 일 목록.
- Calendar task와 project Goal을 source badge로 분리하고 완료를 상호 동기화하지 않음.
- 오른쪽은 선택 할 일의 프로젝트·Goal·근거·예정된 시간 블록을 표시.
- 오늘 일정은 시간축으로 작게 병치하되 일반 할 일과 같은 체크박스를 쓰지 않음.
- 제외: 전체 backlog, 자산 수치, 원시 event log.

## 화면 B — 스킬·도구

핵심 질문은 “무엇이 존재하고, 현재 이 환경에서 실제로 쓸 수 있으며, 근거가 있는가”다.

- 상단 필터 `전체 201 / 스킬 100 / 에이전트 13 / MCP 1 / 플러그인 4 / 훅 7 / 더보기`.
- 목록은 이름, 실제 종류명, 정본 단계, 지원 환경, 현재 PC를 보여준다.
- 선택 항목은 kind별 상세 렌더러를 사용한다. `design-team` 정적 상세에는 역할 구성을 표시하지 않는다.
- 실행 영수증이 있을 때만 역할·실행 환경·모델·사용 도구를 서로 다른 필드로 표시한다.
- 관계는 한 줄 화살표 대신 두 줄 고정 행으로 표시한다.
- 검증된 Calendar 관계가 없으므로 mock `다음 일정`은 표시하지 않는다.
- 제외: install/update/restore 실행, secret, catalog lifecycle을 runtime으로 추론.

## 화면 C — 지식·디자인

핵심 질문은 “이 기준과 결과가 어디서 왔고, 무엇에 적용됐으며, 사람이 승인했는가”다.

- 목록 보기 `전체 / 문서 / 디자인`. 결정은 종류 필터와 상세 근거로, 관계 문제는 `확인 필요`로 제공한다.
- 기본 표는 title, kind, owner, source, status, latest verification.
- 선택 항목 검사 열은 source ref·Git ref·hash, 적용 범위, 파생 결과, backlinks, decision evidence를 표시.
- 관계는 선택 항목 중심 목록이 기본이며 그래프는 보조 보기다.
- Design Intelligence validator 오류는 `색인됨`과 별도로 원인·영향을 표시한다.
- 제외: binary 복제, global spaghetti graph, auto promotion, 출처 없는 정상 배지.

## 공통 검수 기준

- 사이드바와 본문 아이콘은 20px named vector 기준으로 형태가 깨지지 않는다.
- `작업`의 세 자식이 한 번의 시선과 한 번의 클릭으로 접근된다.
- 관계 한 건마다 출발·동사·대상·상태가 최소 16px 간격으로 읽힌다.
- 스킬·도구 12 kind와 현재 합계 201이 카탈로그에서 계산된다.
- mock data는 시안 데이터임을 표시하고 실제 source 상태처럼 오인시키지 않는다.
- 실제 원장에 연결되지 않은 목록·검사 열에는 각각 `예시 데이터`가 계속 보인다. 정본 수량도 하드코딩하지 않고 카탈로그 응답에서 계산한다.
- 1440px에서 검사 열은 400px, 중앙 핵심 목록은 최소 680px을 확보한다.
- 상태는 색만으로 전달하지 않는다.
- production 구현은 사용자가 화면군을 승인한 뒤에만 시작한다.
