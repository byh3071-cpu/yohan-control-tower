# 작업 형제 보기 구현·검증

- 날짜: 2026-08-25 (Asia/Seoul)
- Phase: 관제탑 vNext 작업 화면 전환
- Goal: 23 작업 형제 보기와 안전한 URL 복원
- 라우팅: L · 격리 Orca Dispatch writer
- 상태: DONE · 독립 P1 검토 보정·강화된 전체 gate·Goal 23 재완료

## 결과

기존 상위 `projects` 슬롯을 `작업`으로 바꾸고 `할 일 / 일정 / 프로젝트`를 한 클릭 형제 보기로 묶었다. 새 `WorkView`는 형제 navigation과 query 상태를 소유하며, Todo·Calendar·Project child는 기존 원장과 쓰기 경계를 유지한 채 재사용했다.

- no-query는 NOW를 유지한다.
- canonical query는 `view=work&surface=todo|calendar|projects`이며 date·mode·item·mission·project만 allowlist·정규화한다.
- Todo는 Goal·문서·Calendar task를 stable key로 합성하고 `지금 / 오늘 / 예정 / 대기`로 분류한다. 선택 전 우측은 실제 오늘 Calendar event/time block이며 Calendar task만 기존 Calendar PATCH로 완료한다.
- Calendar same-origin POST/PATCH/DELETE, 409 충돌, soft delete·restore, 월간·목록 의미를 보존했다.
- Project 목록·lint·detail을 독립 상태로 읽어 lint/detail 실패에도 목록을 유지하고 stale selection을 fail-closed로 닫는다.
- 상위 탭은 5개이며 다른 네 탭 이름·책임은 변경하지 않았다. NOW의 프로젝트 행동은 `work/projects`로 이동한다.

## 통합 계보

- base: master `3e6c38ecd8a29a13c861a4796dbd655f46081777`
- design ref: `codex/control-tower-design-direction@c176c3b`
- 통합 방식: feature branch에서 `--no-ff --no-commit`; commit·push·PR·master merge 없음
- master Goal 15·16 및 checker를 보존했다.
- design Goal 15·16은 Goal 21·22로 재번호화했다.
- 중복 Goal 2 중 Focus Feed UI Goal을 14로 옮겨 Goal ID를 고유하게 만들고 Goal 2·13 `DONE` 상태를 보존했다.
- 역사 `captures/goal-16/`과 `2026-08-24-goal-16-now-r3.md`는 당시 ID 증거로 이름을 유지하고 현재 Goal 22 mapping을 문서화했다.
- `.vhk/events/ai-actions.jsonl`과 `.vhk/ledger.jsonl`은 중복 없는 append-union으로 보존했다.

## TDD·회귀

1. `work-navigation.test.ts`를 먼저 만들고 module 미존재 실패를 확인한 뒤 parse·serialize·canonicalize와 refresh/back-forward round-trip을 구현했다.
2. `work-items.test.ts`로 Goal·문서·Calendar 합성, stable key, partial matrix, 네 그룹 분류, 오늘 event 투영, Calendar-only completion을 고정했다.
3. `calendar-route.test.ts`에 Calendar task projection과 completion 회귀를 추가했다.
4. `project-work-model.test.ts`와 `project-route.test.ts`로 projects/lint partial, stale selection, GET-only를 고정했다.
5. NOW-R3의 `goal-tasks`, `now-task`, Calendar route 회귀 8건은 새 구현 전에 먼저 통과했다.

전체 unit/route test는 `89/89` PASS다. sequence 641 보정으로 활성 `작업` 탭 재클릭은 no-op, 다른 탭에서의 진입만 work history를 추가하는 순수 전이 테스트와 `page.tsx` 배선 회귀 테스트 2건을 추가했다.

## 브라우저 QA

- Chrome 151 실제 렌더 36 scenarios
- success: Todo·Calendar·Project × 360·432·768·1280·1440
- state: 각 surface의 loading·error·empty·partial·selected at 1280
- selected responsive: 각 surface at 360·768 추가
- horizontal overflow 0, H1 실패 0, 44px target 실패 0, console error 0, 최소 설명 14px
- controlled Todo→Calendar→Back→Forward, Todo·Project keyboard·768 backdrop, Calendar Back/save/cross-month race를 포함한 47개 assertion이 모두 literal `true`다.
- 상세: `docs/design/control-tower-vnext/work-screen/design-qa.md`
- raw: `docs/design/control-tower-vnext/work-screen/browser-qa-results.json`

## Gate

| Gate | 결과 |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS · 새 오류 0, 기존/생성물 warning만 존재 |
| `npm test` | PASS · 89/89 |
| `npm run build` | PASS · 기존 NFT overtrace warning 1건 |
| `npm run vhk -- goal check --id 23 --force` | PASS |
| 최초 `npm run vhk -- goal done --id 23` | 무효화 · coordinator가 Todo 구조·navigation 증거 불일치를 확인해 같은 Goal을 `IN_PROGRESS`로 복구 |
| 보정 후 `npm run vhk -- goal done --id 23` | PASS · 강화된 Goal checker로 Goal 23 DONE |
| sequence 641 후 `npm run vhk -- goal done --id 23` | PASS · 활성 작업 탭 no-op 회귀 2건 포함 89/89 뒤 Goal 23 DONE |
| `npm run vhk -- verify` | PASS · 5/5 |
| `git diff --check` + cached diff check | PASS |

복구 직후 `goal next`, `context`, `goal peek`, `goal list`는 Goal 23만 `IN_PROGRESS`, Goal 1~22는 `DONE`임을 확인했다. 보정된 Goal checker에 Todo 승인 그룹·오늘 일정 구조와 browser interaction assertion을 필수 실패 조건으로 추가한 뒤 `goal done`을 재실행했고, 최종 `goal next`, `context`, `goal peek`, `goal list`에서 Goal 1~23 전체 `DONE`을 확인했다.

첫 build 시 QA용 Chrome profile이 `.next` 안에서 열려 있어 `EBUSY`가 발생했다. QA browser를 CDP `Browser.close`로 정상 종료한 뒤 같은 build가 통과했으며 production 코드 결함은 아니었다.

## 잔여 위험

- P0 0, P1 0.
- P2: 전역 Header·나머지 상위 탭의 beige shell은 이번 범위 밖이라 Work 내부 neutral shell과 시각 경계가 남는다.
- P2: Calendar event와 Project Goal 진행률의 제한적 orange accent·기존 child radius는 기존 의미를 보존했다. 선택·focus에는 사용하지 않는다.
- production `3001`은 다른 로컬 프로세스가 점유 중이어서 그 프로세스를 건드리지 않고 QA만 `3101`에서 수행했다. 제품 port 계약은 변경하지 않았다.

## 독립 P1 검토 보정

- URL item을 `goal|doc|calendar:<payload>` 닫힌 형식으로 검증한다. 실제 Goal·문서 stable key의 `/`는 URLSearchParams로 round-trip하고, 절대경로·역슬래시·control character·traversal segment는 거절한다.
- 한글·공백 상대경로는 보존하되 drive prefix·leading slash·dot·dotdot segment와 Calendar surface의 Goal·문서 source mismatch를 fail-closed로 거절한다.
- 같은 Goal/doc 파일의 동일 문구 Completion Check는 line discriminator를 stable ID 입력에 포함해 충돌하지 않는다.
- Todo·Project·Calendar stale selection은 해당 source가 authoritative ready가 된 뒤에만 정리하며 자동 canonicalization은 `replaceState`를 사용한다. 세 surface 모두 Back 진입 history trap 회귀를 실제 브라우저로 검증했다.
- Calendar range는 range key·request sequence·AbortController를 함께 사용한다. 새 range render부터 이전 data/error를 비권위로 처리하고 현재 request 성공만 commit해 같은 mounted view의 8월→지연 10월→Back→Forward 반례를 통과했다.
- Calendar 유효 item은 browser Back에서 dialog/editing state가 닫히고 수정 trigger로 focus가 복귀한다. 저장 성공은 history length `48 → 48`을 유지한 replace 전이로 item을 제거해 dialog 재개방을 막았다.
- Todo·Project 모바일 상세에 viewport 조건부 dialog semantics, 내부 focus entry, 양방향 Tab trap, Escape/backdrop close, 원래 row focus return을 추가했다. 768px sheet는 승인 폭 420px을 유지하면서 `768×900` backdrop으로 배경 pointer click을 0건으로 격리했고, 1280px inline detail에는 dialog·aria-modal을 표시하지 않는다.
- Calendar Portal control 8개의 실제 bounding rect를 반올림 없이 기록했고 최소 `45×45px`, 실패 0이었다. browser raw evidence에는 Chrome product·userAgent, focus/history/range race/backdrop/key 증거를 남겼다.
- 완료된 Calendar task는 통합 할 일 projection과 active `지금 / 오늘 / 예정` 그룹에서 제외했다.
- QA Chrome profile은 Git-ignored `logs/`에 격리했다. 삭제하지 않고 ESLint global ignore를 Git ignore 경계와 맞춰 vendor JavaScript가 제품 lint에 섞이지 않게 했다.

## 독립 P1 보정 최종 Gate

| Gate | 결과 |
| --- | --- |
| unit·route regression | PASS · 97/97, suite 4 |
| `npm run typecheck` | PASS · 오류 0 |
| `npm run lint` | PASS · 오류 0, 기존 warning 5 |
| `npm test` | PASS · 97/97, suite 4 |
| `npm run build` | PASS · 21/21 static page generation, 기존 NFT overtrace warning 1 |
| browser QA | PASS · scenarios 36, assertions 47/47, overflow/double-scroll/H1/target/Portal-target/console failure 각 0, 최소 문단 14px |
| `npm run vhk -- goal check --id 23 --force` | PASS · 공용 4 gate + Goal 전용 assertion 12개 |
| `npm run vhk -- goal done --id 23` | PASS · 동일 gate 재검증 후 DONE |
| QA process/port | PASS · 3101·9225 listener 종료 확인 |

최종 독립 P1 보정은 과거 Calendar data가 새 range의 유효 item을 stale 삭제하는 반례를 단순 guard가 아니라 range 소유권·요청 취소·sequence commit 계약으로 막았다. Goal checker는 raw JSON의 history 전후, valid-selection Back close, cross-month delay, 768 backdrop, duplicate·한글 key, Portal 실수 bounding rect를 모두 필수 evidence로 검사한다.

`.vhk/context.md`의 시작 시점 unstaged 차이는 reviewer 실행이 만든 생성 시각 한 줄뿐이었다. staged 구조 변경은 복원하지 않았고, Goal DONE·최종 문서가 확정된 뒤 `vhk context`를 정확히 한 번 실행해 구조와 생성 시각을 함께 갱신하는 controlled context로 대체한다.

남은 위험은 기존 범위 밖 P2 두 건(전역 beige shell 경계, Calendar·Project의 제한적 orange accent/radius)뿐이다. 브라우저 QA는 고정 fixture/CDP 기반이라 실제 로컬 원장의 장기 데이터 다양성은 별도 일상 사용 관찰이 필요하다.

## Goal 23 최종 blocking correction

독립 재검토의 P1 2건과 범위 내 P2 3건 때문에 Goal 23을 `IN_PROGRESS`로 재개했다. Calendar URL optional date·mode는 순수 `resolveCalendarViewState`에서 각각 서울 오늘 날짜·`month`로 reset하며 실제 Back/Forward에서 양쪽 제거와 한쪽 제거를 분리 검증했다. query가 없을 때 상위 current는 `홈`이고 Work shell은 렌더되지 않는다.

Calendar edit dialog는 수동 animation-frame focus와 Dialog 종료 처리가 경쟁하지 않도록 Base UI `finalFocus` 하나로 통합했다. 동일 range 저장 refresh는 기존 keyed 행을 유지해 연결된 edit trigger를 unmount하지 않으며, 성공 저장 raw 결과는 history `50 → 50`, item `null`, dialog `false`, exact active edit ID `task-1@2026-08-25`다. Back과 사용자 close도 같은 final-focus 계약을 사용한다.

Todo·Project backdrop은 360·768px 모두 전체 viewport geometry를 갖고 배경 row pointer count `0`, backdrop close, 원래 row focus return을 통과했다. 360은 승인된 full-screen detail `360×900`, 768은 sheet `420×900`을 유지했다. Todo refresh는 AbortController와 request-id fence를 함께 사용하고, 첫 요청을 지연한 브라우저 race에서 늦은 응답은 canceled됐으며 최신 문구만 전후 모두 남았다. 동일 문구 Completion Check 두 행은 실제 `parseGoalCompletionTasks`가 line 3·4로 만든 `#9da51df7`, `#f8cd0088`을 route-shaped payload로 렌더했고 raw JSON이 parser expected key와 DOM key의 일대일 일치를 보관한다.

### 최종 correction gate

| Gate | 결과 |
| --- | --- |
| targeted Calendar route·Goal parser·navigation·work-items | PASS · 24/24 |
| `npm run typecheck` | PASS · 오류 0 |
| `npm run lint` | PASS · 오류 0, 기존 warning 5 |
| `npm test` | PASS · 99/99, suite 4 |
| `npm run build` | PASS · 21/21 static page generation, 기존 NFT overtrace warning 1 |
| browser QA | PASS · scenarios 36, assertions 62/62, overflow/double-scroll/H1/target/Portal-target/console failure 각 0, 최소 문단 14px |
| QA process/port | PASS · 3101·9225 listener 종료 확인 |

Goal checker·VHK verify·최종 `goal done`은 이 로그와 모든 evidence 파일을 확정한 뒤 수행한다. 최종 판정은 P0 0, P1 0이며 이번 리뷰에서 요구한 P2 3건은 모두 resolved다. 범위 밖 residual P2는 기존 beige 전역 shell 경계와 Calendar·Project의 제한적 orange accent/radius 두 건이다.

## KST 자정·focus fallback 최종 재검증

독립 리뷰 P1의 핵심 가정은 “mount 시점의 `today`가 사용자 액션 시점에도 유효하다”였고, KST 자정을 넘긴 mounted view가 반례였다. 공용 `seoulDate(now)`에 주입 가능한 clock을 두고, Calendar는 매 render의 date 없는 URL 복원과 `오늘` 클릭 시점에 새 서울 날짜를 읽는다. Todo는 각 refresh 요청 시작 시 `today` state와 Calendar 조회 `from`을 같은 서울 날짜로 갱신해 그룹 분류와 조회 범위가 어긋나지 않게 했다.

browser QA는 fake clock을 KST `2026-08-25 23:59:59 → 2026-08-26 00:00:01`로 전진했다. Calendar date 없는 Back과 `오늘` action은 `2026-08-26`을 사용했고, Todo의 `2026-08-26` task는 refresh 전 `예정`에서 refresh 후 `오늘`로 이동했으며 마지막 Calendar request `from`도 `2026-08-26`이었다. route-shaped Goal fixture는 실제 `/api/todos`처럼 `goal:yohan-control-tower/goals/23-work-sibling-views.md#a1b2c3d4`를 사용해 reload round-trip했다.

Calendar edit dialog의 `finalFocus`는 연결된 원래 edit trigger를 우선하고, trigger가 DOM에서 사라졌을 때 연결된 `오늘` button으로 fallback한다. 실제 사용자 `취소`는 `task-1@2026-08-25` trigger로 돌아왔고, 날짜를 10월로 이동 저장해 8월 trigger가 사라진 반례는 `data-calendar-focus-fallback`으로 복귀했다.

### 최종 재검증 gate

| Gate | 결과 |
| --- | --- |
| targeted Calendar route·Goal parser·navigation·work-items | PASS · 25/25 |
| `npm run typecheck` | PASS · 오류 0 |
| `npm run lint` | PASS · 오류 0, 기존 warning 5 |
| `npm test` | PASS · 100/100, suite 4 |
| `npm run build` | PASS · 21/21 static page generation, 기존 NFT overtrace warning 1 |
| browser QA | PASS · scenarios 36, assertions 67/67, overflow/double-scroll/H1/target/Portal-target/console failure 각 0, 최소 문단 14px |
| `npm run vhk -- goal check --id 23 --force` | PASS · 공용 4 gate + Goal 전용 evidence 전체 통과 |
| `npm run vhk -- verify` | PASS · 5/5, warn 0 |
| Goal 상태 | DONE 유지 · `goal peek`은 모든 Goal 완료 |
| QA process/port | PASS · 3101·9225 listener 종료 확인 |

최종 판정은 P0 0, P1 0이다. 이번 리뷰의 P2인 project-prefixed route fixture, 사용자 close focus, trigger 소실 fallback은 모두 resolved다. 범위 밖 residual P2는 기존 beige 전역 shell 경계와 Calendar·Project의 제한적 orange accent/radius 두 건이며 새 기능·탭·API 쓰기 경계는 추가하지 않았다. `.vhk/context.md`는 재검증 전후 동일 hash라 갱신하지 않았다.
