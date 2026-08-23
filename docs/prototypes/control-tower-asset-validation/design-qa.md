# 스킬·도구 구조 검증 프로토타입

- Status: candidate A · browser/keyboard gate passed · task validation not run
- Production boundary: `src/` 변경 없음, 실제 설치·연결·명령 실행 없음
- Visual source: `docs/design/control-tower-vnext/visual-hierarchy-contract.md`
- Data contract: `docs/design/control-tower-vnext/asset-detail-contract.md`
- Prototype: `docs/prototypes/control-tower-asset-validation/index.html`
- Prototype evidence commit: `48b99b9bfd23321258a1bc4c13d536d119aa29b7`

## DesignContext

```json
{
  "contract": {
    "repo": "yohan-brain",
    "ref": "37068a625d85bb3955579a04d87cc0f5c503c823",
    "path": "memory/design-intelligence/index.yaml"
  },
  "resolutionOrder": ["current-request", "project-git", "media", "common-taste", "golden"],
  "constraints": {
    "topLevelNavigationMax": 5,
    "productionUiMutation": false,
    "brainExistingFileMutation": false,
    "assetStateAxes": ["declared-support", "release-inclusion", "local-install", "runtime-verification"]
  },
  "approvedSources": []
}
```

## 작업 컨텍스트 요약

- goal: 종류별 상세 구조가 실제 관제 질문에 답하는지 검증할 수 있는 클릭 프로토타입을 만든다.
- user and target screen: 단일 운영자 요한, 데스크톱 중심 `스킬·도구` 화면.
- approved visual source: 없음. 현재 밝은 중립 셸은 `candidate A`이며 구조 검증 대상이다.
- selected source of truth: 현재 사용자 요청 → 프로젝트 Git의 디자인 계약 → Agent Kit catalog.
- applicable project rules: production UI 수정 금지, 5개 상위 탐색 상한, Brain 읽기 전용, 비밀 값·원본 MCP command 노출 금지.
- acceptance criteria: 아래 5개 과제의 정답률·시간·오해율을 측정하고, 고의 오류 대조본을 검수 게이트가 P0로 잡아낸다.

## 검증할 가설

1. 사용자는 `지원 환경`, `현재 PC`, `검증`을 서로 다른 상태로 이해한다. [미검증]
2. 공통 5열 목록과 kind별 검사 열만으로 주요 질문에 답할 수 있다. [미검증]
3. `스킬·도구`와 실제 종류명 필터가 조어 facet보다 빠르게 이해된다. [미검증]
4. 오른쪽 검사 열 320px가 일반 상세에는 충분하고 중앙 목록을 과도하게 줄이지 않는다. [미검증]
5. 본문 16px·보조 14px가 14/13px 시안보다 읽기 쉽고 여전히 충분히 조밀하다. [미검증]

## 2026-08-22 제한 범위 디자인 감사

- Audit scope: 사용자가 현재 대화에서 제공한 `선택 행`과 `더보기 열림` 화면 두 장, 그리고 같은 상태를 만드는 HTML 코드.
- User goal: 선택 위치와 자산 종류를 빠르게 파악하고, 오른쪽에서 지원 환경·현재 상태·근거를 과도한 해석 없이 확인한다.
- Evidence limit: 수정 뒤 브라우저 캡처는 사용 브라우저가 정해지지 않아 만들지 않았다. 아래 평가는 제공된 두 화면과 정적 코드에 한정되며 전체 흐름 감사가 아니다.

| 심각도 | 발견 | 판단 근거 | 조치 |
| --- | --- | --- | --- |
| P1 | 선택 행 왼쪽의 파란 3px 선이 선택 배경과 의미가 중복되고 자산명보다 먼저 보였다. | 사용자 제공 화면 1과 현재 요청 | 선 제거, 선택 배경만 유지 |
| P1 | `더보기` 팝오버가 버튼이 아니라 필터 행 전체의 오른쪽에 정렬됐다. | 사용자 제공 화면 2, `.filters` 기준 `right: 0` 코드 | 버튼 전용 wrapper 아래로 anchoring |
| P1 | 팝오버가 `role=menu`였지만 메뉴 항목의 위·아래 키 이동을 구현하지 않았다. | WAI-ARIA menu pattern의 요구와 기존 이벤트 비교 | application menu 의미 제거, 일반 필터 버튼 모음으로 단순화; Tab·Escape·바깥 클릭 유지 |
| P1 | 검사 열에서 종류·단계·현재 PC·지원 환경·근거가 모두 같은 강도로 반복됐다. | 코드의 연속 section 구조와 사용자 피드백 | `종류 → 이름 → 설명 → 핵심 상태 2개` 순으로 위계 재구성, 근거 기본 접힘 |
| P1 | 클릭 가능한 `<tr role="button">`가 표의 행 의미를 덮어썼다. | HTML 정적 검사 | 이름 열에 실제 button을 두고 행은 표 의미 유지 |
| P2 | 실행 환경에 시각 표식이 없었다. | 사용자 요청 | 프로토타입은 각 서비스 favicon과 텍스트명을 함께 사용. production은 로컬 고정 자산 승인 필요 |

### 2026-08-22 후속 수정

- 배경이 포함된 site favicon을 제거하고, Lobe Icons `@lobehub/icons-static-svg@1.91.0`의 `claudecode`, `codex`, `cursor`, `antigravity` 투명 SVG로 교체했다.
- 네 SVG 모두 `<svg>` 원본이며 background `<rect>`와 raster `<image>`가 없음을 확인했다.
- 실행 환경 아이콘을 30px padded tile에서 배경·테두리 없는 40px 원본 표시로 확대했다.
- 상단의 중복 `상세` 버튼을 제거했다. 검사 열을 닫은 뒤에는 목록의 자산명을 다시 선택하면 열린다.
- 데스크톱은 다섯 열 머리말을 눌러 `오름차순 → 내림차순 → 기본 순서`로 순환한다.
- 모바일은 표 머리말이 숨겨지므로 별도 native `정렬` select를 제공한다.
- `aria-sort`를 각 열 머리말에 동기화하고, 지원 환경 정렬은 선언된 지원 대상 수를 사용한다.

### 2026-08-22 지원 환경 광학 보정 감사

- Audit scope: 사용자가 현재 대화에서 제공한 192×280px `지원 환경` 영역 캡처 한 장.
- User goal: 네 실행 환경을 이름보다 과하게 튀지 않으면서 빠르게 구분한다.
- Strength: 투명 SVG와 텍스트 이름이 함께 있어 브랜드 형상과 명칭을 동시에 식별할 수 있다.
- UX risk: 40px 아이콘·44px 행·8px 행 간격 조합은 약 52px pitch를 만들고, 세로형 Antigravity 실루엣이 다른 이름보다 먼저 보인다.
- Adjustment: 아이콘 34px, 아이콘 칸 36px, 이름 간격 10px, 행 높이 40px, 행 사이 4px, 텍스트 줄높이 22px.
- Accessibility note: 아이콘은 장식으로 `alt=""`를 유지하고 바로 옆의 실제 환경명이 접근 가능한 이름 역할을 한다. 지원 상태는 별도 텍스트로 유지한다.
- Evidence limit: 캡처가 지원 상태 열과 검사 열 전체 경계를 포함하지 않고, 수정 뒤 동일 상태 캡처도 아직 없다. 전체 오른쪽 패널의 시각 통과를 주장할 수 없다.

결론: 원본 30px보다 식별력이 높고 40px보다 이름 위계가 안정되는 중간값을 채택했다. 이는 현재 캡처에 대한 광학 보정이며 같은 폭의 수정 뒤 캡처로 확인해야 한다. [확신 중간]

### 감사에 사용한 외부 기준

- WAI-ARIA APG menu/keyboard pattern: <https://www.w3.org/WAI/ARIA/apg/patterns/menubar/>
- Primer ActionMenu accessibility: <https://primer.style/product/components/action-menu/accessibility/>
- VS Code extension state separation: <https://code.visualstudio.com/docs/configure/extensions/extension-marketplace>

`더보기` 팝오버는 유지한다. 일곱 종류를 상단에 모두 펼치면 기본 필터가 13개가 되어 5개 핵심 종류의 탐색성이 낮아지고, 하나의 `기타`로 합치면 실제 kind를 잃는다. 다만 이것은 아직 사용성 실험 전의 설계 판단이며, 종류별 사용 빈도 데이터가 생기면 상단 고정 항목을 다시 정렬해야 한다. [확신 중간]

## 사용자 과제와 정답

진행자는 기능을 설명하지 않고 프로토타입만 보여준다.

| 번호 | 과제 | 기대 답 | 실패 신호 |
| --- | --- | --- | --- |
| 1 | `design-team`을 Codex에서 쓸 수 있는지와 현재 PC 설치 여부를 확인한다. | 지원 대상, 설치는 확인 안 됨 | 지원을 설치로 오해 |
| 2 | `critical-thinking`을 Cursor에서 쓸 수 있는지 확인한다. | 지원 안 함, Claude Code 전용 | 4개 환경 지원으로 오답 |
| 3 | `mcp.yohan`에 필요한 설정과 현재 연결 상태를 확인한다. | `YOHAN_ECOSYSTEM_ROOT`, 연결은 확인 안 됨 | 값·command를 찾거나 연결됨으로 오답 |
| 4 | `session-title` 훅의 현재 상태와 확인되지 않은 운영 정보를 말한다. | 후보, 설치·이벤트·실패 정책·제한 시간 미확인 | 후보를 활성 상태로 오해 |
| 5 | `critical-thinking` 플러그인이 포함하는 종류를 확인한다. | 스킬·에이전트·명령·훅 | 하위 항목을 독립 설치 수로 해석 |

## 정량 통과선

| Check | Condition | Threshold | Reading | Verdict |
| --- | --- | --- | --- | --- |
| 종류 인지 | 과제별 첫 선택 | 5초 이내 5/5 | 미측정 | not run |
| 상태 구분 | 지원·설치·검증 질문 | 오답 0/5 | 미측정 | not run |
| 과제 완료 | 위 5개 과제 | 각 20초 이내, 5/5 성공 | 미측정 | not run |
| 용어 이해 | 사후 질문 | `정본 단계`, `지원 환경`, `현재 PC`를 자기 말로 구분 | 미측정 | not run |
| 복구 | 잘못 선택 후 목표 항목 재탐색 | 10초 이내 | 미측정 | not run |
| 본문 가독성 | 100% 확대, Windows | 16px 본문·14px 보조를 확대 없이 읽음 | Chromium computed 16px·14px | pass |
| 가로 overflow | 360·432·768·1280·1440px | 0px | 다섯 viewport 모두 0px | pass |
| 키보드 | 필터→검색→목록→상세→닫기 | 모든 경로 도달, focus 표시 | menu·검색·선택·modal 순환·세 종료 경로 확인 | pass |
| 콘솔 | 같은 5개 viewport | 오류 0건 | console 0, page error 0 | pass |
| WCAG 대비 | 토큰 산술·computed style | 4.5:1·4.5:1·3:1 | ink/paper 15.23:1, slate/paper 5.95:1, white/current 5.83:1, current/paper 5.52:1; computed 색상 일치 | pass |

## 고의 오류로 게이트 검증

`index.html?variant=misleading`은 검수 게이트 자체를 시험하는 **의도적으로 잘못된 대조본**이다. `released` 자산을 근거 없이 `설치됨`으로 표시한다.

- 기대 결과: 검토자가 `정본 단계 → 현재 PC 설치 상태`의 잘못된 추론을 P0로 판정한다.
- 실패 조건: 이 대조본이 통과하거나 일반 시안으로 승인된다.
- 안전 표시: 화면 상단에 `의도적으로 잘못된 대조본`을 지속 표시한다.

## 구현된 상호작용

- 종류 필터와 `더보기` raw kind 메뉴
- `더보기`는 트리거 바로 아래에 열리고, 하위 종류 선택 뒤 선택한 종류명이 트리거에 유지됨
- 이름·종류 검색
- 이름·종류·정본 단계·지원 환경·현재 PC 정렬과 3단계 기본 순서 복귀
- 모바일 native 정렬 선택
- 이름 열의 실제 버튼을 통한 마우스·Enter·Space 선택
- 위·아래 화살표로 목록 이동
- 종류별 검사 열 전환
- `Esc`와 닫기 버튼으로 검사 열 닫기
- 종류·자산명·설명·정본 단계·현재 PC 순의 검사 열 머리말과 기본 접힘 근거
- 1280px 미만 sheet, 767px 이하 전체 화면 상세
- 767px 이하 목록 카드 변환
- 버튼 동작 확인용 비파괴 toast

## 2026-08-23 브라우저 재검증

- Browser: Windows Chromium 151, Playwright.
- Scope: `design-team` 선택·상세 열림 상태의 반응형, 모달 경계, 포커스 순환·복귀, 콘솔, computed style, 브랜드 SVG 렌더링.
- 비교 증거: `audit/01-support-environments-before.png` → `audit/02-responsive-after.png`.
- 적용 경계: 1279px 이하만 modal dialog이며, 1280px 이상은 기존 complementary side panel을 유지한다.

| Viewport | 가로 overflow | 상세 형태 | 키보드 결과 | 판정 |
| --- | ---: | --- | --- | --- |
| 360×1000 | 0px | 전체폭 modal | Tab·Shift+Tab 내부 순환, Escape·닫기 뒤 `design-team` 복귀 | pass |
| 432×1000 | 0px | 전체폭 modal | Tab·Shift+Tab 내부 순환, Escape·닫기 뒤 `design-team` 복귀 | pass |
| 768×1000 | 0px | 380px modal + backdrop | 내부 순환, Escape·backdrop 뒤 `design-team` 복귀 | pass |
| 1280×900 | 0px | 320px side panel | dialog·`aria-modal`·background inert 없음 | pass |
| 1440×1100 | 0px | 320px side panel | dialog·`aria-modal`·background inert 없음 | pass |

### 접근성·오류 영수증

- 모달 진입: `#closeInspector`로 포커스를 먼저 이동한 뒤 `.topbar`, `.sidebar`, `.main`에 `inert`와 `aria-hidden=true`를 적용한다.
- 모달 순환: 8회 연속 Tab과 6회 역방향 Shift+Tab에서 활성 요소가 모두 `#inspector` 내부에 남았다.
- 종료: Escape, 닫기 버튼, 768px backdrop 클릭이 동일한 종료 경로를 사용하고 배경을 복원한 뒤 호출 자산으로 포커스를 돌린다.
- 반응형 전환: 열린 상태로 1280px에 진입하면 dialog·`aria-modal`·backdrop·background inert가 해제되고 상세는 side panel로 유지된다. 다시 modal 폭으로 진입하면 닫기 버튼으로 포커스가 이동한다.
- Console errors: 0. Page errors: 0. 빈 favicon 요청은 `data:,` favicon으로 제거했다.
- Computed type: body 16px / 25.6px, secondary 14px. 색상은 ink `rgb(23,35,38)`, slate `rgb(82,99,103)`, paper `rgb(247,249,249)`, primary `rgb(20,108,148)`로 기존 대비 산술과 일치한다.
- 브랜드 아이콘: Lobe Icons SVG 4종 모두 각 viewport에서 `naturalWidth > 0`, computed 34×34px, 가로 잘림 없음.

### 재현 절차

1. 프로토타입 디렉터리를 localhost로 제공하고 Chromium에서 새 문서로 연다.
2. 360×1000, 432×1000, 768×1000, 1280×900, 1440×1100 순으로 viewport를 바꾸고 매번 문서를 다시 연다.
3. 각 폭에서 `documentElement.scrollWidth - clientWidth`, inspector role·`aria-modal`, main inert·`aria-hidden`, backdrop 상태, 아이콘 `naturalWidth`, computed type·color를 기록한다.
4. modal 세 폭에서 Tab 8회와 Shift+Tab 6회를 실행해 활성 요소가 계속 inspector 내부인지 확인한다.
5. Escape·닫기 버튼·768px backdrop으로 각각 종료하고 inspector hidden, background inert 해제, 활성 자산 ID 복귀를 확인한다.
6. 새 문서에서 console error와 page error를 수집하고, `더보기`·검색·3단계 정렬·자산 선택·모바일 정렬을 smoke-test한다.

### 이번 범위 판정

- 해결된 P1: modal 상태에서 배경 자산으로 키보드 포커스가 빠지던 문제.
- 해결된 P2: 768px에서 상세 패널과 배경의 시각적 경계가 약하던 문제. 18% ink backdrop을 추가했다.
- 잔존 P0/P1: 없음.
- 잔존 P2: prototype-only 원격 SVG를 production에서 로컬 승인 자산으로 고정해야 한다. 실제 사용자 5개 과제 검증과 실제 보조기술 조합 검증은 별도 제품 승인 게이트다.

## 현재 확인된 한계

- 실제 사용자의 과제 수행 결과가 없다. 구조 적합성을 주장할 수 없다.
- 실행 환경 표식은 Lobe Icons 1.91.0의 투명 SVG를 버전 고정한 prototype-only 원격 자산이다. 네 URL은 현재 HTTP 200 `image/svg+xml`을 반환하지만, 로컬 전용 production에는 외부 요청을 남기지 않고 승인된 원본을 프로젝트에 고정해야 한다.
- 왼쪽 탐색과 일반 기능 아이콘은 아직 제외했다. production에서는 설치된 `lucide-react`와 승인된 브랜드 자산을 구분해 써야 한다.
- 프로토타입 데이터는 2026-08-22 catalog의 대표 항목만 담은 고정 fixture다. 전체 201개 검색 성능과 긴 이름은 미검증이다.
- Playwright Chromium 기계 검증은 통과했지만 실제 Windows 보조기술과 터치 기기 조합 검증을 대체하지 않는다.
- 이 프로토타입은 비교 상태를 보여 주기 위해 작은 화면에서도 `design-team` 상세가 열린 채 시작한다. production의 일반 목록 진입점이라면 초기 상세 닫힘이 더 예측 가능한지 별도 결정해야 한다. [확신 중간]

## 정적 검사 영수증

- HTML 내 JavaScript: 수정 뒤 `node --check -` 통과.
- 선택 행: inset edge 선언 없음, 실제 button으로 선택 경로 전환.
- `더보기`: trigger wrapper anchoring, 일반 필터 버튼 semantics, 선택명 유지 로직 확인.
- 실행 환경 SVG 4개: 정적 검사에서 HTTP 200, `image/svg+xml`, background `<rect>`·raster `<image>` 없음을 확인했고, 2026-08-23 동적 재검증에서 다섯 viewport 렌더를 확인했다.
- 지원 환경 광학 토큰: 34px icon / 36px column / 10px horizontal gap / 40px row / 4px list gap / 22px line-height 정적 확인.
- 정렬: 이름 오름·내림, lifecycle 단계순, 지원 대상 수 comparator 실행 테스트 통과.
- 정렬 접근성: 다섯 열 `aria-sort`, 3단계 순환, 모바일 native select 경로 확인. 데스크톱 이름 정렬은 `agent-kit-hook → skeptic → design-team`으로 오름·내림·기본 복귀했고, 모바일 오름차순도 `agent-kit-hook`부터 표시했다.
- 상호작용 smoke: `더보기` 열기 시 첫 종류 버튼으로 이동하고 Escape 뒤 트리거로 복귀, `mcp` 검색 1건, `mcp.yohan` 선택·닫기 뒤 같은 자산으로 복귀를 브라우저에서 확인했다.
- modal 접근성: Chromium에서 overlay 배경 inert, dialog 의미, 순·역방향 focus loop, 세 종료 경로와 breakpoint 전환을 기계 검증했다.
- 반응형 캡처: `audit/02-responsive-after.png`에 360·432·768·1280·1440px 동일 상태를 한 화면으로 보존했다.
- 브라우저 오류: 다섯 viewport에서 console error 0, page error 0.
- 토큰 대비: 네 조합 모두 선언 threshold를 상회하고 브라우저 computed color·font-size가 선언값과 일치했다.
- catalog kind 합계: 201. 프로토타입은 대표 8개 fixture만 렌더링함.
- `git diff --check`: 통과.
- `verify:docs`: 통과.

## 다음 게이트

1. 설명 없는 5개 과제 수행과 시간·오답 기록.
2. `misleading` 대조본이 P0로 거절되는지 검수.
3. 실제 Windows 보조기술과 터치 기기 조합에서 modal 경로를 확인.
4. production 채택 시 원격 브랜드 SVG를 승인된 로컬 자산으로 고정.
5. 위 제품 검증을 통과한 뒤에만 구조 승인 여부를 사용자에게 요청.

## 판정 범위

- Design-to-HTML 기술 구현 게이트: passed.
- 실제 사용자 5개 과제와 구조 승인 게이트: not run.
- Git 보존 게이트: partial. 프로토타입과 비교 증거는 `48b99b9bfd23321258a1bc4c13d536d119aa29b7`에 보존됐지만, 위에서 참조한 `visual-hierarchy-contract.md`와 `asset-detail-contract.md`는 아직 미추적 상태다.
- 전체 디자인 상태: candidate A. 기술 구현은 통과했지만 Git 보존 전에는 Design-to-HTML 인수인계를 차단한다.

final result: blocked
