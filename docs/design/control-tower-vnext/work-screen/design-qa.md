# Goal 23 · 작업 형제 보기 디자인 QA

- 검증일: 2026-08-25 (Asia/Seoul)
- production runtime: localhost `3001`
- QA runtime: 기존 `3001` 점유를 건드리지 않고 동일 worktree를 `127.0.0.1:3101`에서 실행
- browser: `Edg/151.0.4129.101` headless (`HeadlessChrome/151.0.0.0` userAgent), Chrome DevTools Protocol `1.3` 실제 렌더·키보드 입력
- visual/content SoT: `design-spec.md`, `taste-profile.md`, `work-item-language-contract.md`, `surface-set-v2.md`, NOW-R3 shell evidence at design ref `c176c3b`
- 결과 원본: `browser-qa-results.json`
- 자동화: `scripts/qa-work-screen.mjs`

## 같은 상태 비교

승인 source의 `surface-set-v2.md` 화면 A `작업 · 할 일`, 1440px success·첫 행 선택 전 상태를 production `captures/todo-success-1440.png`와 비교했다.

| 불변식 | 승인 source | 구현 | 판정 |
| --- | --- | --- | --- |
| 형제 진입 | `할 일 / 일정 / 프로젝트` 한 시선·한 클릭 | 상단 3분할 nav, 현재 보기는 `aria-current`+3px 청록선 | pass |
| 밝은 셸 | `#E7ECEE / #F7F9F9 / #172326 / #526367` | Work shell과 child CSS variable에 동일 token | pass |
| 선택·focus | selected `#E7EFF5`, focus `#146C94` | Todo·Calendar·Project 선택과 focus ring에 적용 | pass |
| 콘텐츠 경계 | Goal·문서·Calendar task를 source와 함께 표시 | 각 행에 Lucide icon+텍스트 source, Calendar만 완료 action | pass |
| Todo 구조 | `지금 / 오늘 / 예정 / 대기` 통합 목록 + 선택 전 `오늘 일정` 보조 열 | 기준일 기반 네 그룹·필터와 실제 Calendar event/time block 360px 열 | pass |
| 목록 위계 | H1 28–32px, 본문 16px, 설명 14px 이상 | H1 28–32px, shell body 16px, 측정 최소 설명 14px | pass |

prototype의 fixture 수량·가상 sidebar는 복제하지 않았다. 현재 production의 5개 상위 탭을 유지하고 승인된 Work 구조만 기존 `projects` 슬롯 안에 적용한 의도적 차이다.

## viewport 결과

세 surface의 success를 각 폭에서 실제로 렌더했다. 모든 행에서 document horizontal overflow `0px`, Work H1 `1개`, 44px 미만 target `0개`, console error `0건`이었다.

| viewport | 할 일 | 일정 | 프로젝트 | 반응형 판정 |
| ---: | --- | --- | --- | --- |
| 360×900 | `todo-success-360.png` | `calendar-success-360.png` | `projects-success-360.png` | 한 열, Calendar agenda 우선, overflow 0 |
| 432×900 | `todo-success-432.png` | `calendar-success-432.png` | `projects-success-432.png` | 한 열, 44px target, overflow 0 |
| 768×900 | `todo-success-768.png` | `calendar-success-768.png` | `projects-success-768.png` | stack/sheet 경계, 이중 scroll 0 |
| 1280×900 | `todo-success-1280.png` | `calendar-success-1280.png` | `projects-success-1280.png` | max 1176, Calendar·Project 2열 |
| 1440×900 | `todo-success-1440.png` | `calendar-success-1440.png` | `projects-success-1440.png` | max 1176, Calendar·Project 2열 |

선택 상세는 `*-selected-360.png`, `*-selected-768.png`, `*-selected-1280.png`로 추가 확인했다. 360px Project 상세와 Todo 상세는 전체 화면, 768px은 폭 420px 우측 sheet, 1280px은 붙은 우측 열이며 가로 overflow와 이중 scroll이 모두 0이었다. Todo·Project는 1023px 이하에서만 `role=dialog`·`aria-modal=true`이고 1280px inline detail은 modal 의미가 없었다. backdrop bounding rect는 두 surface 모두 360px에서 `360×900`, 768px에서 `768×900`이고 768 sheet는 `420×900`을 유지했다. 360에서는 전체화면 sheet가 pointer target이 되어 배경 행 click count `0`인 상태와 실제 backdrop element close를 분리 측정했고, 768에서는 노출 backdrop 좌표의 실제 pointer click으로 닫았다. 두 폭·두 surface 모두 close 뒤 원래 행 focus가 돌아왔다. Calendar Portal visible control 8개의 반올림하지 않은 bounding rect 최소값은 `45×45px`이며 실패는 0개다.

## 상태 matrix

각 surface를 1280px에서 `loading / error / empty / partial / selected`로 실제 렌더하고 DOM text·수치·PNG를 남겼다.

| surface | loading | error | empty | partial | selected |
| --- | --- | --- | --- | --- | --- |
| 할 일 | nav 유지+두 원장 로딩 | 두 source 실패 안내 | 통합 empty+오늘 일정 empty | Goal·문서 네 그룹 유지+Calendar 실패 안내 | source·완료 owner·근거 상세 |
| 일정 | nav 유지+Calendar 로딩 | 오류 banner+구조 유지 | 선택일 0건+월 grid | 손상 원장 file issue+살아 있는 Calendar | item dialog와 URL item 복원 |
| 프로젝트 | nav 유지+projects 로딩 | projects 실패 안내 | 빈 project list | projects 목록 유지+lint 실패 안내 | detail 독립 load·Goal 진행률 |

- stale Todo item과 Project name은 해당 source가 authoritative ready가 된 뒤 현재 응답에 없을 때만 URL selection을 fail-closed로 제거한다. Goal source 실패 fixture에서는 production-shaped item URL이 그대로 남았다.
- detail 실패 fixture에서 Project URL selection과 프로젝트 목록 2개, lint는 유지되고 상세 오류만 독립 표시됐다.
- child 오류 상태에서도 Work 형제 nav와 단일 H1은 남는다.

## URL·키보드·focus

- canonical form: `?view=work&surface=todo|calendar|projects`; field order는 `view → surface → date → mode → item → mission → project`다.
- 이미 활성인 상위 `작업` 탭을 다시 누르면 URL·history를 바꾸지 않는 no-op이며, 다른 상위 탭에서 `작업`으로 들어올 때만 현재 work location을 push한다.
- no-query refresh는 NOW를 유지한다. 잘못된 surface·date·mode·token과 미허용 query는 drop 또는 safe default로 정규화된다.
- 실제 `/api/todos` route 형식의 project-prefixed key `goal:yohan-control-tower/goals/23-work-sibling-views.md#a1b2c3d4`를 URL encode한 뒤 reload해 동일 item과 상세 제목을 복원했다. `doc:memory/decisions/한글 문서.md#11111111`도 URLSearchParams encode/decode 뒤 같은 item과 상세로 복원됐다.
- 실제 route가 사용하는 `parseGoalCompletionTasks`에 같은 Goal·같은 문구 Completion Check 두 줄을 통과시켜 line 3·4에서 `#9da51df7`, `#f8cd0088`을 생성했다. raw evidence는 parser 산출 ID·line·text·예상 rendered key와 DOM 두 행을 함께 기록하고 일대일 일치를 검사한다.
- absolute Windows/POSIX path, drive prefix, leading slash, 역슬래시, control character, dot·dotdot segment와 Calendar surface의 Goal·문서 item mismatch는 거절되어 URL에 포함되지 않았다.
- 형제 nav controlled history: Todo에서 `ArrowRight` focus가 일정으로 이동하고 `Enter` 뒤 `?view=work&surface=calendar`, Back 뒤 Todo, Forward 뒤 Calendar를 실제 URL equality assertion으로 검증했다.
- stale Todo·Project·Calendar selection의 자동 canonicalization은 모두 `replaceState`를 사용했다. 각 stale entry 직전의 서로 다른 surface로 Back이 한 번에 복귀해 history trap이 없음을 검증했다.
- 목록: Todo는 첫 Goal에서 다음 Calendar task로, Project는 `yohan-control-tower`에서 `yohan-brain`으로 `ArrowDown` focus가 이동하고 `Enter` 선택 URL을 실제 assertion했다.
- 360px과 768px Todo·Project 상세, Calendar Portal dialog는 열릴 때 내부 focus entry와 순방향·역방향 Tab wrap을 실제 active element index로 검증했다. `Esc`와 두 폭의 backdrop close 뒤 원래 행으로 focus가 복귀했다.
- Calendar URL에서 date·mode가 함께 사라지는 Back은 `2026-08-25/month`, Forward는 `2026-10-20/list`를 복원했다. mode만 사라지면 같은 날짜에서 `month`, date만 사라지면 같은 `list`에서 서울 오늘 날짜로 각각 독립 reset됐다. query가 완전히 없을 때는 상위 `홈`이 current이고 Work shell은 없었다.
- 결정론적 browser fake clock을 KST `2026-08-25 23:59:59 → 2026-08-26 00:00:01`로 전진했다. date 없는 Calendar history entry로 Back했을 때 `2026-08-26/month`가 복원됐고, 과거 날짜에서 `오늘`을 누른 URL도 `date=2026-08-26`을 사용했다. Todo는 같은 mounted view에서 새로고침 전 `2026-08-26` task를 `예정`으로, 새로고침 뒤 `오늘`로 재분류했고 Calendar 요청 `from`도 `2026-08-26`이었다.
- Calendar 유효 item을 행에서 연 뒤 browser Back으로 item query를 제거했을 때 dialog가 닫혔고 수정 trigger `task-1@2026-08-25`로 focus가 복귀했다.
- Calendar 수정 dialog의 사용자 `취소`는 연결된 원래 edit trigger로 focus를 돌려보냈다. 날짜를 10월로 이동 저장해 원래 8월 trigger가 DOM에서 사라진 반례에서는 항상 연결된 `오늘` fallback button으로 focus가 복귀했다.
- Calendar 수정 저장 성공은 history length `50 → 50`을 유지한 채 item을 replace로 제거했고 dialog가 닫혔다. 900ms 뒤에도 item `null`, dialog `false`였으며 active element의 정확한 `data-calendar-edit-id`는 `task-1@2026-08-25`라 재개방·focus race가 없었다.
- Todo refresh 두 요청을 겹쳐 첫 응답을 지연한 뒤 최신 응답을 먼저 반영했다. 이전 요청은 abort되어 늦은 fulfill이 canceled됐고, 이후에도 최신 문구만 남아 request-id fence와 cancellation을 함께 증명했다.
- 같은 mounted Calendar에서 8월 item → 지연된 10월 item → Back → Forward를 실행했다. 지연 중 10월 item URL은 조기 제거되지 않았고 loading이 표시됐으며, Back 뒤 취소된 늦은 10월 응답은 8월 dialog를 바꾸지 않았다. Forward의 현재 10월 응답만 resolve한 뒤 10월 dialog가 열렸다.
- 위 67개 interaction assertion은 `browser-qa-results.json`에서 모두 literal `true`이며 하나라도 false면 QA script와 Goal checker가 실패한다.
- 현재 위치는 `aria-current`, row는 `role=option + aria-selected`, focus는 2px `#146C94` ring으로 색 외 의미를 함께 제공한다.

## 쓰기·보안 경계

- Todo의 Goal·문서는 read-only이며 완료 request를 만들지 않는다.
- Calendar task만 기존 `PATCH action=set_task_completion`을 사용한다. Goal Completion Check와 자동 동기화하지 않는다.
- 완료된 Calendar task는 통합 할 일의 active `지금 / 오늘 / 예정` 그룹과 items projection에서 제외된다.
- Calendar `POST/PATCH/DELETE` same-origin, 수정·삭제 409 optimistic concurrency, soft delete·restore route test가 통과했다.
- Project 목록·상세 API는 `GET` export만 유지한다.
- URL token은 allowlist를 통과하며 개인·시스템 절대경로·secret은 query와 새 browser payload에 없다.

## 타이포·대비·아이콘

- computed minimum paragraph: `14px`; Work shell body: `16px`; H1: `28–32px`.
- `#172326` on `#F7F9F9`: `15.23:1`; `#526367` on `#F7F9F9`: `5.95:1`; focus `#146C94` on `#F7F9F9`: `5.52:1`; selected text `#172326` on `#E7EFF5`: `13.84:1`.
- Work surface, source, navigation, state action은 `lucide-react` named icon을 사용했다. emoji·handwritten SVG·색 단독 상태 전달은 없다.

## 결함 판정

- P0: 0
- P1: 0
- P2-01: 전역 Header와 나머지 네 상위 탭은 기존 beige shell을 유지해 Work 내부 neutral shell과 경계가 보인다. 이번 Goal은 다른 네 탭의 이름·책임·전역 shell 전환을 승인받지 않았으므로 보존했다.
- P2-02: Calendar event와 Project Goal 진행률의 제한적 orange accent·기존 child radius가 남아 있다. 선택·focus 의미에는 쓰지 않으며 기존 Calendar/Project 의미 보존을 우선했다.
- resolved P2: 활성 `작업` 탭 재클릭이 동일 URL history entry를 추가하던 동작은 `resolveTopViewAction`의 `no-op` 계약과 page 배선 회귀 테스트로 제거했다.
- resolved reviewer P2: Todo·Project backdrop을 360·768px 모두 viewport 전체로 렌더하고 배경 pointer 차단·backdrop close·원래 행 focus 복귀를 raw geometry와 active element로 증명했다. 768px sheet `420×900` 계약은 유지했다.
- resolved reviewer P2: Todo 겹친 refresh는 AbortController와 request-id fence를 함께 사용하며, 지연된 이전 응답이 최신 권위 문구를 덮지 못하는 브라우저 race를 통과했다.
- resolved reviewer P2: 동일 문구 Completion Check QA fixture key를 하드코딩하지 않고 실제 production parser 산출 두 ID를 route-shaped payload와 DOM 행에 연결했다.
- resolved reviewer P2: Goal refresh fixture를 실제 route가 내는 project-prefixed ID로 교체했고, Calendar user close의 정확한 trigger focus와 이동으로 trigger가 사라지는 경우의 연결된 fallback focus를 raw active element로 고정했다.

## 최종 계측

- scenarios: 36
- interaction assertions: 67/67
- overflow failures: 0
- double-scroll failures: 0
- H1 failures: 0
- 44px target failures: 0
- Calendar Portal controls: 8 actual bounding rect measured / 0 failures / minimum 45×45px
- console errors: 0
- minimum paragraph: 14px
- capture set: success 3 surfaces × 5 viewports, 1280 state matrix 3 × 5, selected detail 3 × 360/768

final result: passed
