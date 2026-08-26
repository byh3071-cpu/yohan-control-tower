# Goal 16 NOW-R3 Scout 인수인계

## 인수인계 상태

- owner scope: 요한 관제탑 Goal 16 NOW-R3 구현 전 조사
- state: 사람 결정 게이트 대기
- prepared at: 2026-08-24 (Asia/Seoul)
- content receipt: 원본 Scout 보고서 SHA-256 `25138c35735a5bf9eef032a80fcc5630b471e4c4f960edf9d24fdf1da4736259`
- source snapshot: `codex/control-tower-design-direction@46da6ea`
- orchestration receipt: Run `run_c9c9407f7f62`, Task `task_a9410fd8a70c`, Dispatch `ctx_f77eeaf9e628`, outcome `succeeded`
- delivery receipt: Delivery `delivery_0c67c8ebd918` 처리 후 ACK 완료
- worker cleanup receipt: `worker-release` 실행 결과 `retained / identity_unproven / processAction=none`; 잘못된 프로세스 종료 방지를 위해 raw terminal close로 우회하지 않음
- cleanup 재관측: 해당 worker terminal은 이후 `connected=false`, `writable=false`, `paneRuntimeId=-1`, `exitCause=operator_close`로 종료 상태이며 실행 작업트리 경로도 더 이상 존재하지 않는다. 추가 종료를 재시도하지 않는다.
- files modified by Scout: 0

## 2026-08-24 보존 시점 재검증

- 관제탑 정본 체크아웃: `master@3e6c38ecd8a29a13c861a4796dbd655f46081777`; 이 문서를 만들기 전 Git 상태는 clean이었다.
- 디자인 작업트리: `codex/control-tower-design-direction@c176c3bfd6d781b6c171a313018ab5b06aa18af3`; 현재 `.vhk/context.md` 수정 상태다.
- Scout 실행 작업트리: `byh3071-cpu/explain-screenshot-image@e5694a98ee7641a18e084bd526f3a680f688698a`; 현재 `.playwright-mcp/`가 미추적 상태다.
- 아래 원문의 상태·HEAD·미추적 파일 설명은 조사 시점 스냅샷이다. 현재 실측과 다르면 현재 Git 상태를 우선하고 원문을 덮어쓰지 않는다.
- 이 문서는 조사 결과의 영속 보존만 수행한다. 구현 writer 권한이나 워크트리 소유권을 새로 부여하지 않는다.

## 현재 사람 결정 게이트

1. 데이터 출처 API: 권장안 `/api/now` 신설과 Goal Scope 정정 여부
2. Goal ID 16 충돌: 재번호 또는 기존 미추적 Goal 정리 방향
3. 디자인 작업트리의 단일 writer와 소유권 확정

## 다음 첫 행동

가장 가까운 관제탑 규칙과 `.vhk/HARD_STOP`을 다시 확인한 뒤, 위 세 결정을 사람에게 받아 단일 writer를 지정한다. 결정 전에는 Goal 파일 재번호, 디자인 작업트리 구현, 기존 사용자 변경 정리를 하지 않는다.

---

## Scout 보고서 원문 보존본

# Goal 16 정찰 보고 — NOW-R3 "지금" 화면 실데이터 구현 경로

- 작성: 2026-08-24 (Asia/Seoul) · 읽기 전용 Scout
- 대상: `C:\Users\Public\dev\_worktrees\yohan-control-tower-design` (branch `codex/control-tower-design-direction`, HEAD `46da6ea`)
- 파일 수정·커밋·브랜치 변경: **0건** (이 보고서는 레포 밖 세션 스크래치패드)

---

## 0. 목적 한 줄

승인된 `docs/prototypes/control-tower-now-mova-r3/index.html`을 기준으로, 상단 탭 5개를 그대로 둔 채 홈(`home-view.tsx`)만 실제 Goal·Task 데이터로 바꾸는 최소 경로를 확정한다.

## 1. 범위·리스크 한눈에

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| Goal 16 승인 여부 | 승인됨 | `design-spec.md` 실행 영수증 마지막 행 — "production 구현 / Goal 16 / 승인 · 2026-08-24" |
| Goal 16 문서 | 조사 중 생성됨 | `goals/16-live-now-r3.md` (IN_PROGRESS·P0) + `scripts/check-goal-16.mjs` |
| 예상 수정 파일 | 6~8개 | 아래 §2 — **L 경계**(≥7). 최소안 6개면 M |
| 가장 큰 위험 | **Goal 16 Scope가 지목한 `/api/todos`로는 목표 달성 불가** | §3-0 · §6 R0 |
| 사람 결재 필요 | 3건 | 데이터 출처 API · Goal 번호 충돌 · 워크트리 소유권 |

---

## 1-A. 조사 중 생긴 변화 (2026-08-24 11:52~11:56)

다른 세션이 이 워크트리를 **실시간 편집 중**이다. 조사 도중 관측된 변화:

| 시각 | 변화 |
| --- | --- |
| 11:52:11 | `goals/15-control-tower-design-direction.md` 체크 3/5 → **5/5 완료** |
| ~11:53 | `scripts/check-goal-15.mjs` 신규 |
| ~11:56 | **`goals/16-live-now-r3.md` 신규** (id 16 · IN_PROGRESS · P0 · Completion Check 9개) + `scripts/check-goal-16.mjs` |

이 보고서는 그 Goal 16 문서까지 반영해 갱신했다. 단, 아래 §3-0이 그 문서의 Scope 한 줄과 정면으로 충돌한다.

---

## 2. 수정 예상 파일 목록

### 신규 (3)

| 경로 | 책임 |
| --- | --- |
| `src/lib/now-controller.ts` | 순수 함수 — Completion Check 파싱 + 활성 Goal 선택 규칙 |
| `src/lib/now-controller.test.ts` | `node --test` 단위 검증 (러너가 `src/lib` 만 스캔 — §6 R9) |
| `src/app/api/now/route.ts` | 읽기 전용 GET. 기존 `/api/projects` 패턴(`dynamic="force-dynamic"`, `runtime="nodejs"`, `withNoStoreJson`) 그대로 |

### 수정 (3~5)

| 경로 | 변경 내용 |
| --- | --- |
| `src/lib/ecosystem-projects.ts` | `countCompletionChecks`(내부 함수, 118행)를 **항목 텍스트까지 반환**하도록 확장. 기존 `checks:{total,done}` 계약은 유지(파괴적 변경 금지 — `project-view.tsx:362,379`가 소비 중) |
| `src/lib/types.ts` | `GoalCheckItem` · `NowSelection` · `NowResponse` 추가. 공용 타입 SoT는 여기 (벡터만 `src/lib/vector/types.ts`) |
| `src/components/home-view.tsx` | 428행 → R3 구조로 감축. 미션 카드·관제 신호·캘린더 모드 이동 또는 제거 |
| `src/app/page.tsx` | `HomeView` props 변경 반영(365~375행). 캘린더 모드 제거 시 이동처 결정 |
| `src/app/globals.css` | (선택) R3 토큰 매핑. **별도 Goal로 미루는 걸 권장** — 미루면 파일 6개 = M |

### 이번에 건드리지 말 것

- `src/components/view-tabs.tsx` — 탭 5개 SoT. 상단 내비 유지가 전제이므로 무변경.
- `src/components/todo-view.tsx` · `calendar-view.tsx` · `project-view.tsx` — spec의 구현 Goal 2번(`작업` 형제 보기) 소관.
- 스킬·도구 관련 일체 — production 데이터 소스가 없어 fixture가 곧 가짜 상태가 된다(spec 명시).

---

## 3-0. 최우선 발견 — Goal 16 Scope의 `/api/todos`로는 이 화면을 만들 수 없다

`goals/16-live-now-r3.md`의 Scope 첫 줄은 이렇게 적혀 있다.

> `/api/todos` 응답에서 활성 Goal과 다음 Task를 고르는 순수 선택 계약

이 API는 목표를 달성할 수 없다. 근거 두 가지 모두 실측이다.

**① `/api/todos`는 관제탑이 아니라 brain의 goals를 읽는다.**

`src/app/api/todos/route.ts:29~35`의 SCAN_DIRS는 `resolveRepoRoot()` 기준이고, `resolveRepoRoot()`는 `YOHAN_OS_ROOT`(=brain)만 해석한다. 게다가 brain 판정 조건이 "`memory/` 디렉토리 존재"인데 관제탑 레포에는 `memory/`가 **없다** — 즉 이 API가 관제탑 자신의 `goals/`를 가리키는 경우는 구조적으로 불가능하다.

실측: brain `goals/`에는 `type: goal` 파일이 29개 있고 활성은 1개(`22-yohan-studio-os-vnext-shell.md`)다. 따라서 Scope대로 구현하면 NOW 화면에는 **brain의 Goal 22**가 뜬다. Goal 16 문서의 계보 메모가 전제한 "저장소 전체에는 Goal 13과 이 Goal이 동시에 보일 수 있으므로"는 `/api/todos` 경로에서는 성립하지 않는다 — 13도 16도 거기 안 나온다.

**② 나온다 해도 Task 문장·`TASK n/total`을 만들 수 없다.**

`/api/todos`는 `INTENT_HEADING = /(다음\s?액션|할\s?일|TODO|To-?do|남은|후속)/i` 아래의 체크박스만 항목으로 만든다. **`## Completion Check`는 이 정규식에 매칭되지 않는다.** goal 파일은 전부 fallback 분기로 떨어져 `heading: "goal"`, `text: <goal 제목>` **1건**만 나온다(`route.ts` collectGoals). 즉 현재 Task 문장도, 완료 진행률도, `TASK 4/5` 카운터도 `TodosResponse`에는 존재하지 않는다.

### 해소안 (사람 결재)

| 안 | 내용 | 비용·리스크 |
| --- | --- | --- |
| **A (권장)** | 신규 `/api/now` + `readGoalRecords` 계열로 관제탑 레포 goals를 읽는다. Goal 16 Scope 한 줄을 `/api/now`로 정정 | 기존 `/api/todos`·`todo-view` 무회귀. 파일 +1 |
| B | `/api/todos`의 SCAN_DIRS·파서를 확장해 관제탑 goals와 Completion Check까지 담는다 | 공용 API 계약 변경 → `todo-view.tsx`·`home-view` 기존 소비자 회귀 위험 |
| C | Scope를 문자 그대로 지킨다 | R3가 보여준 화면과 다른 결과물이 나온다. **비권장** |

---

## 3. 데이터 출처 — 여기가 핵심 함정

| 후보 | 실제로 읽는 곳 | 판정 |
| --- | --- | --- |
| `/api/todos` | `resolveRepoRoot()` = **brain** 루트의 `goals/`·`memory/**`·`docs/**` (`route.ts:29~35` SCAN_DIRS) | **부적합.** R3가 보여준 `goals/15-control-tower-design-direction.md`는 관제탑 레포 파일이라 이 API로는 영원히 안 나온다 |
| `/api/projects/[slug]` | `resolveReposRoot()` = `YOHAN_REPOS_ROOT/<repo>/goals` (`ecosystem-projects.ts:readGoalRecords`) | **적합.** frontmatter + Completion Check 집계까지 이미 있음 |

- 관제탑은 `projects.yaml:82`에 `yohan-control-tower: { mission: ai-solo-os, status: active }`로 등록돼 있다.
- **미결(사람 결재)**: NOW가 관제탑 1개 레포만 볼지, `projects.yaml`의 전체 프로젝트를 훑어 활성 Goal을 모을지. 후자면 활성 Goal 복수가 상시 발생한다.
- `readGoalRecords`는 **개별 체크 항목 텍스트를 반환하지 않는다**(`checks:{total,done}` 카운트만). R3의 현재 Task 문장·NEXT 문장을 만들려면 확장이 필수다.

### R3 화면 요소 ↔ 실제 소스 대조

| R3 요소 | 실데이터 소스 | 가능? |
| --- | --- | --- |
| `PHASE · …` | **없음** — goals 16개 frontmatter 전수 키 = `vhk_format/type/id/title/status/priority/completed` | ✗ → 계약대로 **줄 생략** |
| `GOAL 15 · <제목>` | `id` + `title` | ✓ |
| `TASK 4 / 5 · NOW` | (미완료 첫 항목 index) / total | ✓ |
| H1 = 현재 Task 문장 | 첫 미완료 Completion Check 텍스트 | ✓ (파서 확장 후) |
| 한 줄 설명 | **없음** | ✗ → 숨김 |
| 상태 `검토 대기` | VHK status는 4값뿐(NOT_STARTED/IN_PROGRESS/DONE/BLOCKED) | ✗ → `진행 중` 등으로만 매핑, "검토 대기" 창작 금지 |
| `목표 진행 3 / 5 완료` | `checks.done` / `checks.total` | ✓ |
| 완료 기준 카드 | **없음** | ✗ → 숨김 |
| 기준 문서 = `goals/15-….md` | `goal.file` | ✓ (라벨만. 클릭 불가 — §6 R7) |
| `NEXT` | 두 번째 미완료 Completion Check | ✓ |
| 이슈·담당자·기한 | 연결값 없음 | ✗ → 영역 통째 숨김(계약 준수) |

> 검증: Goal 13은 6개 중 3개 완료 → `TASK 4/6`. 조사 시작 시점의 Goal 15는 5개 중 3개 완료 → `TASK 4/5`, `진행 3/5`. **R3 프로토타입 수치와 정확히 일치** — 매핑이 맞다.

---

## 4. 권장 순수 함수 계약

```ts
// src/lib/types.ts (추가)
export interface GoalCheckItem {
  index: number      // 1-based, Completion Check 섹션 내 순번
  text: string       // 마크다운 강조 제거 후 원문
  done: boolean
  line: number       // 파일 내 줄번호 (역추적용)
}

/** 화면 상태 — 색이 아니라 값으로 구분한다 */
export type NowState =
  | "ready"            // 활성 Goal 1개 + 미완료 Task 있음
  | "no_active_goal"   // 활성 0 → "진행할 작업 없음"
  | "ambiguous_goal"   // 활성 2개 이상 → "우선 작업 확인 필요" (AI가 고르지 않음)
  | "no_open_task"     // 활성 1개인데 미완료 체크 0
  | "unavailable"      // env 미설정·읽기 실패 → 원인 문장 노출

export type UserGoalStatus = "예정" | "진행 중" | "막힘" | "완료" | "확인 필요"
```

```ts
// src/lib/now-controller.ts (신규) — 전부 I/O 없는 순수 함수
export function parseCompletionChecks(content: string): GoalCheckItem[]
export function selectActiveGoals(goals: GoalTask[]): GoalTask[]
export function deriveUserStatus(raw: string | null): UserGoalStatus
export function selectNow(input: GoalWithChecks[]): NowSelection
```

### 선택 규칙 (0 / 1 / 복수)

| 활성 Goal 수 | 반환 state | 화면 |
| --- | --- | --- |
| 0 | `no_active_goal` | "진행할 작업 없음" — 주요 행동은 프로젝트 탭 열기 하나 |
| 1, 미완료 체크 ≥1 | `ready` | 첫 미완료 = NOW, 두 번째 미완료 = NEXT (없으면 NEXT 영역 숨김) |
| 1, 미완료 체크 0 | `no_open_task` | Goal 이름만 보여주고 "완료 확인 필요" |
| ≥2 | `ambiguous_goal` | "우선 작업 확인 필요" + 후보 목록. **자동 선택 금지** |

**타이브레이크에 priority를 쓰지 말 것.** 실측: 디자인 워크트리의 활성 Goal 13·15가 **둘 다 P0**라 우선순위로 갈리지 않는다. `design-spec.md`도 "여러 Goal이 우선순위를 다투면 AI가 하나를 고르지 않고"라고 명시했다.

**활성 판정 allowlist (PAT-001)**: `ACTIVE` · `IN_PROGRESS`만 활성. 나머지는 기존 `addTaskStatus`(`ecosystem-projects.ts:196`) 분류를 재사용하고, 미지값은 버리지 말고 `확인 필요`로 표면화한다.

**Phase**: goals에 `phase` 필드가 없음이 실측 확인됐다(전수 16파일). `work-item-language-contract.md`가 "이름을 AI가 추론하지 않는다"고 못 박았으므로 **Phase 줄은 렌더하지 않는다**. Phase를 살리려면 `goals/_meta.md` 또는 frontmatter에 선언 필드를 먼저 추가하는 별도 결정이 필요하다.

---

## 5. 테스트 케이스 (`src/lib/now-controller.test.ts`, `node --test`)

| # | 케이스 | 기대 |
| --- | --- | --- |
| T1 | `## Completion Check` 아래 `- [x]` 3 + `- [ ]` 2 | 5개 파싱, done 3, index 1~5 |
| T2 | `## Forbidden` 등 다음 H2에서 정지 | Forbidden 섹션의 체크박스 미포함 |
| T3 | `Completion Check` 섹션 자체가 없음 | 빈 배열, 예외 없음 |
| T4 | `- [X]` 대문자 · 앞 공백 들여쓰기 | done=true 로 인식 |
| T5 | 활성 0개(전부 DONE) | `no_active_goal` |
| T6 | 활성 1개 + 미완료 2개 | `ready`, NOW=4번째, NEXT=5번째, `TASK 4/5` |
| T7 | 활성 1개 + 미완료 1개 | `ready`, NEXT 영역 없음 |
| T8 | 활성 1개 + 미완료 0개 | `no_open_task` |
| T9 | 활성 2개(둘 다 P0) | `ambiguous_goal`, 후보 2건, 자동 선택 0 |
| T10 | 활성 2개(P0·P1) | 여전히 `ambiguous_goal` — 우선순위로 몰래 고르지 않는다 |
| T11 | `status: WIP` 같은 미지값 | 활성으로 세지 않고 `확인 필요`로 표면화, 조용히 버리지 않음 |
| T12 | 같은 `id: 2`인 goal 2개 | 식별자는 `file` 기준이라 충돌 없음 |
| T13 | `title` 누락 | 파일명 fallback, `titleDeclared:false` 유지 |
| T14 | Task 텍스트에 `**강조**`·백틱 | 마크다운 기호 제거된 평문 |
| T15 | 아주 긴 한국어 Task 문장(120자+) | 잘라내지 않고 그대로 반환(줄임은 뷰 책임) |
| T16 (broken gate) | 가짜 Issue·미선언 Phase가 든 fixture | 렌더 계약이 **실패**하는지 먼저 확인 (spec의 broken fixture 요구) |
| T17 | 비활성(BACKLOG·NOT_STARTED) Goal의 미완료 체크만 존재 | 현재 Task로 **승격하지 않음** (Goal 16 Completion Check 1번 직접 대응) |
| T18 | 문서 출처 Todo(`origin.kind === "doc"`)가 섞임 | 현재 Task 후보에서 제외 (같은 Completion Check 대응) |

라우트 테스트를 붙인다면 `src/lib/calendar-route.test.ts` 패턴(`NextRequest` 직접 생성 + tmpdir fixture + env 주입)을 그대로 따르면 된다.

---

## 6. 발견 위험

| # | 심각도 | 내용 |
| --- | --- | --- |
| **R0** | **차단급** | **Goal 16 Scope의 `/api/todos`로는 이 화면을 만들 수 없다.** ① 이 API는 brain goals만 읽고(관제탑엔 `memory/`가 없어 구조적으로 대상이 될 수 없음) ② goal 파일은 `## Completion Check`가 intent heading에 안 걸려 "제목 1건"으로만 나와 Task 문장·`TASK n/total`이 아예 없다. 상세·해소안은 §3-0 |
| R1 | **높음** | **워크트리 동시 점유.** 조사 중(11:52:11) `goals/15-control-tower-design-direction.md`가 외부에서 수정됐고(체크 3/5→5/5), 11:56경 `goals/16-live-now-r3.md`·`scripts/check-goal-16.mjs`가 새로 생겼다. 다른 세션이 이 브랜치를 실시간 편집 중이며 "같은 레포·같은 브랜치 2에이전트 금지" 규칙에 걸린다. 구현 착수 전 소유권 정리 필요 |
| R2 | **높음** | **Goal 번호 16이 메인 체크아웃과 충돌한다.** 메인 체크아웃(`C:\Users\Public\dev\yohan-ecosystem\yohan-control-tower`, master)에 **미추적** `goals/15-vhk-policy-baseline.md` · `16-design-team-supervision-protocol.md` · `17`·`18`·`19`가 이미 있다. 방금 만들어진 `16-live-now-r3.md`와 파일명은 다르지만 **id가 둘 다 16**이라 머지·`vhk goal` 조회 시 의미가 붕괴한다 → 재번호(20 이상) 또는 메인 미추적 파일 정리 중 사람이 택일 |
| R3 | **높음** | **live 데이터가 워크트리와 다르다.** `/api/projects`는 `YOHAN_REPOS_ROOT/yohan-control-tower`(=메인 체크아웃 작업트리)를 읽는다. 디자인 워크트리에서 dev 서버를 띄워도 화면엔 메인의 goals가 뜨고, 메인은 추적 파일이 **전부 DONE = 활성 0**이다. 즉 기본 화면이 `no_active_goal`. 검증에는 fixture가 필수다 |
| R4 | 중간 | **활성 복수가 실제 상황이다.** 디자인 워크트리는 Goal 13·15가 동시에 IN_PROGRESS였고 둘 다 P0. `design-spec.md`도 잔여 위험으로 명시했다. 단일 선택 규칙을 만들면 안 된다 |
| R5 | 중간 | **중복 goal id.** `2-ecosystem-home-mvp.md`와 `2-focus-feed-knowledge-review-ui.md`가 모두 `id: 2`. React key·URL 식별자로 `id`를 쓰면 충돌한다. 기존 `GoalRow`가 이미 `goal.file`을 key로 쓰고 있으니 **file을 식별자로 유지**할 것 |
| R6 | 중간 | **R3 문구 3개는 정본 소스가 없다.** 한 줄 설명 / 완료 기준 카드 / 상태 "검토 대기". goal 파일에 대응 필드가 없다. 지어내면 `taste-profile.md`의 "근거 없는 수량·장식 상태" 금지에 정면으로 걸린다 → 숨기거나 사람이 소스를 먼저 선언 |
| R7 | 중간 | **주요 행동 버튼의 살아있는 대상이 없다.** `/api/docs` 뷰어는 brain `memory/` 코퍼스 전용이라(`memory.ts:isDocPathAllowed`) `goals/*.md`를 열 수 없다. `deriveOpenPath`도 항상 undefined를 준다. 현재 유일하게 살아있는 경로는 **프로젝트 탭 드릴다운**(`openMissionFromHome`) |
| R8 | 낮음 | R3의 `min-width:1180px`·54px H1을 production에 복제 금지(spec 명시). 검증 폭은 **Goal 16 문서 기준 360·432·768·1280·1440 5폭**(design-spec의 6폭 목록과 다르니 Goal 16 쪽을 따를 것) |
| R9 | 낮음 | **UI 테스트가 `npm test`에 안 잡힌다.** 글롭이 `src/lib/*.test.ts src/lib/**/*.test.ts`뿐이고 vitest·RTL 미설치. 순수 함수를 `src/lib`에 둬야 자동 검증되고, 화면은 Playwright 수동 게이트 |
| R10 | 낮음 | 로컬 환경변수 파일은 yohan-core 보안 가드가 읽기를 차단한다. 필수 env 3종(`YOHAN_OS_ROOT`·`YOHAN_REPOS_ROOT`·`YOHAN_CALENDAR_ROOT`)은 `npm run setup:check`로 선확인 |

---

## 7. Next.js 16 로컬 문서 — 읽어야 할 파일

버전 `16.2.9`, `next.config.ts`는 비어 있어 **Cache Components 미활성**.

| 경로 (`node_modules/next/dist/docs/` 기준) | 왜 |
| --- | --- |
| `01-app/03-api-reference/03-file-conventions/route.md` | 새 `/api/now` Route Handler 계약 |
| `01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md` | **v16.0.0에서 `dynamic`·`revalidate`·`fetchCache`는 Cache Components 활성 시 제거.** 현재 미활성이라 기존 `export const dynamic = "force-dynamic"` 패턴은 계속 유효 — 신규 라우트도 같은 패턴 유지 가능 |
| `01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md` | 기존 라우트가 `runtime = "nodejs"`를 명시 중 |
| `01-app/01-getting-started/08-caching.md` · `09-revalidating.md` | `no-store` 계약(`withNoStoreJson`) 재확인 |
| `01-app/01-getting-started/05-server-and-client-components.md` | `home-view.tsx`가 `"use client"` — 서버 경계 확인 |
| `01-app/01-getting-started/15-route-handlers.md` | 라우트 핸들러 기본 |
| (참고) `.../02-route-segment-config/instant.md` | 16 신규 옵션. 이번 범위에선 불필요 |

---

## 8. 권장 진행 순서

| 순서 | 담당 | 하는 일 | 완료 확인 |
| --- | --- | --- | --- |
| 0 | **사람** | ① **데이터 출처 API 확정**(§3-0 A/B/C) ② Goal id 16 충돌 처리 ③ 디자인 워크트리 소유권 정리 | 세 건 결재 |
| 1 | 구현 | `src/lib/now-controller.ts` + 테스트, `ecosystem-projects.ts` 파서 확장 | `npm test` 통과, T1~T18 |
| 2 | 구현 | `src/app/api/now/route.ts` (A안 채택 시) | fixture 응답 검증 |
| 3 | 구현 | `home-view.tsx` R3 감축 + `page.tsx` 결합 | H1 1개, 주요 버튼 1개, 빈 메타 0 |
| 4 | 검증 | 360·432·768·1280·1440 Playwright + `typecheck`/`lint`/`test`/`build` | 전부 exit 0, 가로 overflow 0, 콘솔 오류 0 |
| 5 | 기록 | `docs/design/control-tower-vnext/design-qa.md`를 `final result: passed`로 마감 | Goal 16 Completion Check 9번 |
| 6 | **사람** | 화면 검수 → 머지 게이트 | 승인 |

## 9. 규모 재판정

파일 6개(globals.css·calendar 제외)면 **M**, 8개면 **L**. 다만 R1~R3(동시 점유·번호 충돌·live 데이터 불일치)은 코드 문제가 아니라 **운영 결정**이므로, 착수 전에 §8-0을 사람이 먼저 닫아야 한다.
