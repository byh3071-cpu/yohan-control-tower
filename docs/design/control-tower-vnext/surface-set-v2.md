# 요한 관제탑 vNext 화면군 v2

- State: proposed · awaiting user selection
- Viewport: 1440×1024 desktop
- Visual direction: 깊은 블랙 셸 + 따뜻한 백색 작업면 + electric blue focus
- Purpose: 동일 시스템의 세 핵심 표면을 비교해 정보구조와 밀도를 승인받는다.

## 공통 셸

왼쪽 탐색은 다섯 상위 영역 `지금 / 작업 / 지식·디자인 / 자동화 자산 / 운영 기록`을 사용한다. 데스크톱에서는 `작업` 아래 `할 일 / 일정 / 프로젝트`를 모든 화면에서 항상 보여주며 각각 독립 URL과 선택 상태를 가진다. `작업` 표제는 접기 버튼과 분리한다. 하단 `시스템 상태`는 utility entry다.

- Shell black: `#030405`
- Raised black: `#0A0C0F`
- Light work surface: `#F7F7F5`
- Pure white: `#FFFFFF`
- Primary text: `#111214`
- Muted text: `#666A73`
- Hairline: `#D9DADF` on light, `#24272C` on dark
- Focus blue: `#315EFB`
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

## 화면 B — 자동화 자산

핵심 질문은 “무엇이 존재하고, 현재 이 환경에서 실제로 쓸 수 있으며, 근거가 있는가”다.

- 상단 facet `전체 197 / 실행 능력 116 / 연결·활성화 12 / 정책·패키징 36 / 검증·도구 33`.
- 목록은 raw kind, owner, catalog, availability, verification, usage를 보여준다.
- 선택 `design-team`은 역할 구성·사용 도구·참조 문서·최근 근거를 요약하되 full prompt와 모델 조직도는 숨긴다.
- 관계는 한 줄 화살표 대신 두 줄 고정 행으로 표시한다.
- 검증된 Calendar 관계가 없으므로 mock `다음 일정`은 표시하지 않는다.
- 제외: install/update/restore 실행, secret, catalog lifecycle을 runtime으로 추론.

## 화면 C — 지식·디자인

핵심 질문은 “이 기준과 결과가 어디서 왔고, 무엇에 적용됐으며, 사람이 승인했는가”다.

- 목록 보기 `문서 / 디자인 / 결정 / 관계 오류`.
- 기본 표는 title, kind, owner, source, status, latest verification.
- 선택 항목 검사 열은 source ref·Git ref·hash, 적용 범위, 파생 결과, backlinks, decision evidence를 표시.
- 관계는 선택 항목 중심 목록이 기본이며 그래프는 보조 보기다.
- Design Intelligence validator 오류는 `색인됨`과 별도로 원인·영향을 표시한다.
- 제외: binary 복제, global spaghetti graph, auto promotion, 출처 없는 정상 배지.

## 공통 검수 기준

- 사이드바와 본문 아이콘은 20px named vector 기준으로 형태가 깨지지 않는다.
- `작업`의 세 자식이 한 번의 시선과 한 번의 클릭으로 접근된다.
- 관계 한 건마다 출발·동사·대상·상태가 최소 16px 간격으로 읽힌다.
- 자동화 자산 12 kind와 합계 197이 정확하다.
- mock data는 시안 데이터임을 표시하고 실제 source 상태처럼 오인시키지 않는다.
- 실제 원장에 연결되지 않은 목록·검사 열에는 각각 `예시 데이터`가 계속 보이며, 정본에서 검증한 `197개`와 facet 합계만 `정본 수량`으로 구분한다.
- 1440px에서 검사 열은 400px, 중앙 핵심 목록은 최소 680px을 확보한다.
- 상태는 색만으로 전달하지 않는다.
- production 구현은 사용자가 화면군을 승인한 뒤에만 시작한다.
