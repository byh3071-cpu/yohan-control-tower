# DesignContext: 요한 관제탑 vNext

- Context version: 0.8
- State: verified
- Owner repository and branch/ref: `yohan-control-tower`, branch `codex/control-tower-design-direction`, verified working tree based on `46da6ea`
- Last verified at: 2026-08-24 (Asia/Seoul)
- Design owner / final approver: 사용자

## Outcome and non-goals

- **Observed** — 제품의 한 줄 목적은 Yohan Brain을 읽어 미션·프로젝트·Goal·문서·벡터를 관제하는 로컬 전용 운영 프론트다.
- **Approved** — 새 디자인은 생태계와 현재 자산을 먼저 조사하고, 사용자가 세 시안 중 방향을 정한 뒤 구현한다.
- **Superseded** — 처음에는 3안의 `어두운 셸 + 밝은 작업면` 대비를 선택했으나, 후속 피드백에서 검정 면이 과하고 영역 경계가 밋밋하다는 이유로 Mova 밝은 중립 셸로 바꿨다.
- **Approved** — 3안에서는 명확한 도구 아이콘과 행 밀도만 유지하고, 2안의 간결한 골격·문서 관계 표현과 Mova 밝은 중립 셸을 결합한다.
- **Rejected 2026-08-24** — NOW-IA-R1 A·B·C는 실제 Phase·Goal·Task 명칭과 지금 행동을 직접 전달하지 못하고 승인·예외·근거를 동급으로 나열해 모두 기각됐다.
- **Approved 2026-08-24** — MOVA처럼 화면 첫 문장이 현재 Task를 직접 말하고, `Phase → Goal → Task`를 한 방향으로 읽으며, 한 행에 객체·상태·핵심 행동을 하나씩만 둔다.
- **Approved 2026-08-24** — NOW-R3의 표준 작업 언어와 감축 방향을 선택했다. `Issue`는 실행 계층이 아니라 실제 외부 추적 기록이 있을 때만 Goal 또는 Task에 연결한다.
- **Approved 2026-08-24** — 첫 화면은 하나의 현재 Task를 주인공으로 두고 완료 기준·기준 문서·NEXT만 기본 노출한다. 값이 없는 메타데이터는 숨긴다.
- **Non-goal** — Notion이나 Brain을 대체하거나, 클라우드 배포 제품을 만들거나, 원시 벡터 운영 정보를 기본 홈에 노출하지 않는다.
- **Observed 2026-08-24** — 디자인 Goal 15는 production UI를 수정하지 않고 종료했으며, 별도로 승인된 Goal 16에서 NOW-R3 첫 구현 슬라이스를 완료했다.

## Users and jobs to be done

- **Observed** — 사용자는 생태계를 직접 운영하는 단일 오너이며 로컬 데스크톱에서 주로 사용한다.
- **Observed** — 핵심 JTBD는 흩어진 진행 상황을 보고 “지금 무엇을 할지”를 빠르게 결정하는 것이다.
- **Inferred** — 가장 비싼 실패는 정보 부족보다 우선순위·소유권·승인 상태가 한 화면에서 섞여 다음 행동을 다시 해석하게 되는 것이다.

## Domain and risk level

- **Observed** — 로컬 개발·지식 운영·AI 검토·프로젝트 관리를 한 제품에서 연결하는 운영 도구다.
- **Observed** — AI는 분류·상태 변경을 제안만 하고 사람 승인이 실제 변경 경계다.
- **Observed** — 기존 Brain 파일 수정, 파괴적 명령, 배포·publish·main 직접 push는 별도 사람 게이트다.
- **Inferred** — 승인과 출처를 잘못 표현하면 실제 정본 변경으로 이어질 수 있어 정보 구조 위험이 중간 이상이다.

## Surfaces, platforms, and target viewports

- **Observed** — Next.js 웹 UI이며 localhost 포트 3001에서 실행하는 로컬 전용 제품이다.
- **Observed** — 현재 구현은 데스크톱과 모바일 재배치를 지원하며 Calendar는 모바일 선택일 우선 흐름을 갖는다.
- **Approved** — 선택 시안 기준 viewport는 데스크톱 1440×1024다. production은 1440·1280·1024·768·390·360px을 검증한다.
- **Observed** — 최종 검증 폭은 360, 432, 768, 1280, 1440px이다.

## Current product state

- **Observed** — 상위 탭은 `홈 / 프로젝트 / 문서·검토 / 기록 / 벡터` 다섯 개로 상한에 도달했다.
- **Observed** — Home은 `오늘의 관제탑`, 개요/캘린더 전환, 빠른 메모, 상위 세 할 일, 관제 신호, 미션 지도를 제공한다.
- **Observed** — 문서 화면의 사이드바는 문서 분류와 아홉 개 빠른 실행을 함께 노출한다.
- **Observed** — 현재 Home과 문서 도구에서 10–13px 텍스트를 광범위하게 사용한다.
- **Observed** — 공통 디자인 규칙은 본문 16px 이상, 보조 문구 14px 이상, line-height 1.6 이상을 요구한다. 현재 구현과 충돌한다.
- **Inferred** — 제품 기능은 충분하지만 Home, 전역 탭, 문서 사이드바, 명령 실행이 서로 다른 우선순위를 동시에 요구해 인지 비용이 커졌다.
- **Superseded** — `지금 / 프로젝트 / 지식·자산 / 스킬·도구 / 운영 기록`은 작업·일정 진입성이 부족해 다음 시안의 기준으로 사용하지 않는다.
- **Superseded 2026-08-24** — 항목 선택 시 항상 우측 검사 열을 두는 규칙은 R3 감축에 맞춰 조건부 상세로 축소한다. 실제 선택이 있을 때만 데스크톱 열·태블릿 sheet·모바일 전체 화면 상세를 연다.
- **Observed** — 2026-08-22 재검증 시 Agent Kit canonical catalog는 201개이며 `skill 100 / script 31 / manifest 18 / rule 14 / agent 13 / hook 7 / config 5 / plugin 4 / command 4 / fixture 3 / mcp 1 / template 1`이다. 이 수량은 변하므로 UI에 하드코딩하지 않는다.
- **Observed** — 기존 `스킬·도구` 시안은 12개 kind 전체를 수용하지 못하고, catalog lifecycle과 설치·runtime·검증을 같은 열 체계로 취급했다.
- **Approved 2026-08-24** — 상위 탐색은 `지금 / 작업 / 지식·디자인 / 스킬·도구 / 운영 기록` 다섯 개로 재구성한다. `작업`의 `할 일 / 일정 / 프로젝트`는 화면 내부 형제 보기로 둔다.

## Existing design system and assets

- **Observed** — 현재 토큰은 따뜻한 아이보리 라이트 테마, 저채도 네이비 다크 테마, 오렌지 포커스/차트 색, 10px 기준 radius를 사용한다.
- **Observed** — lucide-react, shadcn base-nova, Tailwind CSS 4를 사용한다.
- **Observed** — 과거 승인 시안은 저채도 다크 배경, 얇은 구분선, 넓은 여백, 파란 선택 강조, 임시 우측 context peek를 사용한다.
- **Observed** — 과거 승인 문서는 캡처 중심 화면을 기본 홈으로 정했지만 현재 PRD와 코드는 오늘의 행동·미션 관제로 진화했다.
- **Proposed** — 과거 시안은 시각 언어와 선택 시 context peek 패턴의 참고 자산으로 사용하고, 현재 홈 구조의 복제 대상으로 사용하지 않는다.
- **Approved** — 3안의 선명한 Lucide 계열 항목 아이콘과 실제 도구 브랜드 아이콘을 유지한다. 이모지·텍스트 기호·임의 SVG는 사용하지 않는다.
- **Observed** — 생성 시안의 작은 아이콘 왜곡은 ImageGen 래스터 산출물의 표현 오류이며 실제 컴포넌트 자산 사용을 증명하지 못한다.
- **Rejected** — `#030405` 중심의 진한 검정 셸은 좌우 패널이 중앙 작업보다 먼저 보이고 경계가 과도해 다음 시안에서 사용하지 않는다.
- **Approved** — Mova의 밝은 중립 셸을 이어 `#E7ECEE / #F7F9F9 / #172326 / #526367`을 기본으로 하고 hover `#EEF3F6`, selected `#E7EFF5`, focus `#146C94`를 제한적으로 쓴다.

## Taste, forbidden patterns, and reference set

- **Approved** — 관제탑에서 확인된 취향, 금지 패턴, 시안 계보, 짧은 진행 신호의 해석은 `taste-profile.md`를 정본으로 사용한다.
- **Approved** — 범용 디자인 운영 방법은 Yohan Agent Kit `design-team`이 소유하고, 프로젝트별 취향과 결정은 이 저장소에만 둔다.
- **Superseded** — Candidate A는 기술 검증 계보로만 보존한다. 현재 선택 방향은 NOW-R3다.
- **Superseded** — Candidate A 셸은 NOW-R2의 고정 전제가 아니다. 사용자가 MOVA의 색뿐 아니라 직접적인 작업 문법과 골격을 다시 기준으로 지정했다.
- **Observed** — 새 디자인 세션은 `session-handoff.md`의 branch/ref·승인 상태·다음 행동을 되말해야 수신 완료로 본다.

## Information and content contracts

- **Observed** — 계층은 `projects.yaml → <repo>/goals/*.md → .vhk/events/*.jsonl` 순으로 읽는다.
- **Observed** — Brain은 정본이고 Notion은 사람용 뷰·모바일 인박스다. Qdrant는 파생 벡터 인프라다.
- **Observed** — 상태 숫자는 출처, 소유자, 마지막 갱신 또는 unknown을 함께 표현해야 한다.
- **Superseded 2026-08-24** — 승인·이어가기·막힘을 동급 카드로 배열하지 않는다. 현재 Task가 주인공이고 승인·막힘은 Task를 실제로 제한할 때만 주 상태로 나타난다.
- **Approved 2026-08-24** — 사용자용 작업 명칭은 `Phase(사용자 결과 묶음) → Goal(단독 검증 가능한 완료 결과) → Task(지금 실행하는 원자 행동)`로 통일한다. 한국어 이름을 본문으로 쓰고 영문은 작은 분류 레이블로만 사용한다.
- **Approved 2026-08-24** — `Issue`는 장기 추적·외부 협업·크로스레포 의존이 있을 때만 연결한다. 실제 ID·URL이 없으면 화면에 Issue 영역을 만들지 않는다.
- **Superseded** — `design-team`의 역할 구성을 정적 상세에 고정하지 않는다. 실제 실행 기록이 있을 때만 `이번 작업의 역할`을 표시하고 역할·실행 환경·모델·사용 도구를 분리한다.
- **Approved** — 문서 라이브러리, 디자인 지식, 스킬·에이전트, 시안, 결정, 일정은 별도 복제본이 아니라 관계와 역링크로 연결한다.
- **Observed** — 이전 시안의 `오늘 14:00`은 실제 Calendar 원장에서 읽은 값이 아니라 레이아웃 확인용 mock data였다.
- **Proposed** — 스킬·도구 상세에는 검증된 Calendar 관계가 있을 때만 `관련 검토` 역링크를 표시하고, 관계가 없으면 섹션 전체를 숨긴다.

## Technical and operational constraints

- **Observed** — Next.js 16, React 19, TypeScript strict, Tailwind CSS 4, shadcn base-nova를 유지한다.
- **Observed** — `YOHAN_OS_ROOT` 등 환경 기반 경로만 사용하고 절대경로를 하드코딩하지 않는다.
- **Observed** — 프론트 탭은 최대 다섯 개이며 추가가 필요하면 기존 기능을 합친다.
- **Observed** — API는 복잡성을 숨기고 프론트는 결정 가능한 결과를 받는다.
- **Observed** — localhost Qdrant·Ollama와 로컬 파일시스템이 끊길 수 있으므로 partial/stale/unknown 상태를 정상 상태로 설계해야 한다.

## Approval and safety boundaries

- **Approved** — 사용자만 최종 디자인 방향, 밀도, 레이아웃, 상호작용을 결정한다.
- **Approved** — 시각 선택 전 production UI 구현은 금지한다.
- **Observed** — Brain 기존 파일은 수정하지 않으며 확정 지식 승격은 출처 확인과 사람 선택을 요구한다.
- **Observed** — 벡터 reset, 명령 실행, 배포·publish는 일반 탐색 행동과 시각적으로 분리한다.

## Evidence ledger

| Source | State / ref | Supports | Privacy | Recheck |
| --- | --- | --- | --- | --- |
| `RULES.md`, `docs/PRD.md` | `yohan-control-tower@cf61612` | 제품 목적, 탭 상한, 로컬·쓰기·승인 경계 | project internal | 규칙 또는 PRD 변경 시 |
| `src/components/home-view.tsx` | `yohan-control-tower@cf61612` | 현재 Home 정보 구조와 작은 글자 사용 | project internal | Home 변경 시 |
| `src/components/view-tabs.tsx`, `src/components/sidebar.tsx` | `yohan-control-tower@cf61612` | 5탭, 문서 분류·명령 혼합 | project internal | navigation 변경 시 |
| `src/app/globals.css` | `yohan-control-tower@cf61612` | 현재 light/dark 토큰 | project internal | token 변경 시 |
| `memory/core/ecosystem-contract.yaml` | `yohan-brain@5d9e92d`, active v0.3.1 | Brain SoT, Control Tower 소유·쓰기 경계 | ecosystem internal | contract version 변경 시 |
| `memory/core/projects.yaml` | `yohan-brain@5d9e92d`, active v0.1.2 | 미션·프로젝트 정본 | ecosystem internal | version 변경 시 |
| `memory/rules/html-artifact-design.md` | `yohan-brain@5d9e92d` | 본문 16px, 보조 14px, 검증 폭 | ecosystem internal | rule 변경 시 |
| `docs/reference/websites/yohan-workspace-notion-control-tower-concepts.md` | `yohan-brain@5d9e92d` | 과거 승인 정보 구조와 금지 패턴 | ecosystem internal | 승인 문서 supersede 시 |
| `docs/reference/websites/assets/yohan-control-tower-capture-context-peek-approved.png` | SHA-256 `AD24CB137FBC7A4E94D7369CF0A3D7FA9299B46FCEA5A20F63A78CEE30746F5E` | 과거 승인 시각 언어와 context peek | ecosystem internal | 새 시안 선택 시 |
| Linear, Notion, GitHub, Material, W3C 공식 문서 | retrieved 2026-08-22 | 우선순위, 통합 할 일, 다중 view, 반응형 layout, 접근성 | public | 시각 명세 전 |
| `docs/prototypes/control-tower-asset-validation/browser-qa.js` | executed 2026-08-23 | 6개 폭·두 variant·키보드·modal·breakpoint 회귀 검사 | project internal | prototype 변경 시 |
| `docs/prototypes/control-tower-asset-validation/audit/browser-qa-results.json` | 178/178 pass | P0/P1 해소 수치와 오류 0건 | project internal | browser QA 재실행 시 |
| `docs/prototypes/control-tower-asset-validation/audit/03-final-asset-detail-1440.png` | 1440×1024 capture | 선택 방향의 native desktop 상태 | project internal | 시각 방향 변경 시 |
| `docs/design/control-tower-vnext/taste-profile.md` | v1.0 | 사용자 취향, 금지 패턴, 시안 계보 | project internal | 새 명시적 피드백 또는 방향 변경 시 |
| `docs/design/control-tower-vnext/session-handoff.md` | v1.3 | 승인·구현 상태, 다음 단일 작업, 세션 전달 영수증 | project internal | 세션 인수인계 또는 게이트 변경 시 |
| `C:/Users/Public/dev/products/mova/docs/design/mova-ade/evidence/viewport-1440.png` | verified 2026-08-24 | 직접적인 큰 제목, 객체·상태·행동 분리, NOW/NEXT/ALWAYS 골격 | local owner-approved reference | MOVA 승인 화면 변경 시 |
| `docs/prototypes/control-tower-now-mova-r3/now-mova-r3-1440.png` | SHA-256 `DEAD4032E55E5D72ADC24E7A17AB75631BEC27DBD924A9B0086B70B733B2B3DD` | 사용자 승인된 NOW-R3 언어·감축·시각 위계 | project internal | 사용자 방향 변경 시 |
| `docs/design/control-tower-vnext/work-item-language-contract.md` | WORK-ITEM-LANGUAGE-R1 approved | Phase·Goal·Task·Issue 정의와 표시 문법 | project internal | 프로젝트 운영 용어 변경 시 |
| `docs/design/control-tower-vnext/design-spec.md` | CONTROL-TOWER-VNEXT-SPEC-R3 | 다섯 화면 책임, 구현 매핑, 검증 계획 | project internal | 구현 Goal 시작 전 |
| `src/components/now-view.tsx`, `src/app/api/todos/route.ts` | Goal 16 verified working tree | NOW-R3 구현과 `projects.yaml → repo/goals` 읽기 계약 | project internal | NOW 데이터 계약 또는 Home 변경 시 |
| `docs/design/control-tower-vnext/design-qa.md` | final result: passed · 2026-08-24 | 5개 폭, 상태 5종, 키보드, 대비, 실제 Goal 검증 | project internal | NOW 구현 또는 셸 변경 시 |

## Accepted decisions

- **Approved 2026-08-22** — 디자인 조사·시안·토큰·UX·기술 명세를 독립 worktree에서 진행한다.
- **Approved 2026-08-22** — 범용 Design Team 방식으로 프로젝트 컨텍스트를 먼저 만들고 사용자 선택 전 구현하지 않는다.
- **Approved 2026-08-22** — 시각 방향은 3안을 기본으로 하고 2안의 문서·관계 표현을 결합한다.
- **Approved 2026-08-22** — 우측 `작업 맥락`의 과도한 상단 여백과 overlay 느낌을 제거하고 본문과 정렬된 전용 검사 열로 다듬는다.
- **Approved 2026-08-22** — 에이전트와 스킬은 내부 프롬프트를 노출하지 않고 `무엇을 맡는가 / 무엇을 사용했는가 / 무엇을 남겼는가`만 표현한다.
- **Approved 2026-08-24** — NOW-R3를 선택하고 표준 작업 언어·한 화면 한 주인공·빈 메타 숨김을 다섯 화면의 공통 문법으로 사용한다.
- **Observed** — Home은 한 화면, 상위 탭은 다섯 개 이하, AI 행동은 제안과 사람 승인을 분리한다.

## Rejected or deferred decisions

- **Deferred** — 과거 캡처 중심 승인 시안을 현재 Home의 최종안으로 그대로 사용하지 않는다. 시각 언어와 선택 상태 패턴만 계승한다.
- **Approved 2026-08-24** — Vector는 상위 탭에서 제거한다. 검색은 `지식·디자인`, 인덱스·ingest·로컬 서비스 상태는 `운영 기록`이 소유한다. 기능 삭제가 아니라 화면 소유권 이동이다.
- **Rejected** — 출처 없는 생산성 수치, 장식용 차트, 여섯 번째 상위 탭, 화면마다 중복되는 빠른 실행 목록.
- **Rejected** — 전체 시스템 프롬프트, 비밀 설정, 장문의 에이전트 컨텍스트를 상세 패널에 그대로 노출하는 구성.
- **Rejected** — 우측 패널이 전역 헤더 아래에서 어색하게 시작하거나 본문 위를 덮어 선택 행과 관계가 끊기는 구성.
- **Rejected** — 모든 자산에 역할 조직도·설치·연결 상태를 같은 카드 구조로 강제하는 구성.
- **Rejected** — `Codex`를 담당자·작성자·역할로 고정하거나 실행 환경과 모델을 한 필드로 합치는 구성.
- **Rejected** — `자동화 자산`, `실행 능력`, `연결·활성화`처럼 설명이 필요한 조어를 기본 탐색에 사용하는 구성.
- **Rejected 2026-08-24** — Goal·승인·예외·근거를 같은 무게로 배열하고 `이어가기 중심 / 승인 중심 / 예외 중심`처럼 화면 관점을 제목으로 쓰는 NOW-IA-R1 세 안.

## Open questions and contradictions

- **Resolved 2026-08-24** — 조건부 상세는 데스크톱 최대 360px, 태블릿 sheet, 모바일 전체 화면으로 명세한다. 사용자가 폭을 조절하는 기능은 초기 구현 범위에서 제외한다.
- **Open** — 캘린더 전체 화면의 기본 보기를 주간으로 할지 월간으로 할지 실제 일정 밀도로 검증한다.
- **Open** — 관계는 목록형 경로를 기본으로 하고, 작은 그래프 보기를 보조 기능으로 둘지 사용성 검증이 필요하다.
- **Open** — 목록에서 반복되는 `릴리스 · 확인 안 됨`과 검사 열의 긴 source ref가 실제 사용 시 필요한 밀도인지 최종 미감·과제 검증에서 유지 또는 축약을 결정한다.
- **Resolved 2026-08-24** — `할 일 / 일정 / 프로젝트`는 `작업` 화면 내부 형제 보기로 구성해 한 번의 클릭과 5탭 상한을 함께 지킨다.
- **Resolved** — 12종은 `스킬 / 에이전트 / MCP / 플러그인 / 훅 / 더보기`처럼 실제 용어로 탐색한다. `더보기`에서도 raw kind를 그대로 표시한다.
- **Contradiction** — 과거 승인 문서의 capture-first와 현재 PRD의 “지금 뭐 하나”가 충돌한다. 새 방향은 Home에서는 “지금 뭐 하나”를 우선하고 capture는 전역 입력으로 축소한다.
- **Unknown** — 실제 최근 일주일의 탭 사용 빈도와 불필요 화면 데이터는 없다. 삭제보다 hide/defer를 우선한다.

## Freshness and next verification

NOW-R3는 정적 승인 뒤 Goal 16에서 실제 Goal 데이터와 360·432·768·1280·1440px, loading·error·empty·single·multiple 상태, 키보드, 대비, 경로 allowlist를 검증했고 `design-qa.md`가 passed로 끝났다. 다음 사람 게이트는 권장 순서 2번인 `작업`의 할 일·일정·프로젝트 형제 보기를 독립 Goal로 만들지 여부와 그 범위 승인이다.
