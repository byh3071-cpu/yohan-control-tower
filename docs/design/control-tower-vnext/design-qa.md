# Goal 22 · NOW-R3 구현 QA

> 재번호화 mapping: 이 문서는 design branch 당시 Goal 16의 역사 증거를 현재 Goal 22로 보존한다. 따라서 `captures/goal-16/`과 `goal16-*` 파일명은 바꾸지 않는다.

- Date: 2026-08-24 (Asia/Seoul)
- Goal: `16-live-now-r3.md`
- Approved source: `docs/prototypes/control-tower-now-mova-r3/index.html`
- Approved reference capture: `docs/prototypes/control-tower-now-mova-r3/now-mova-r3-1440.png`
- Implementation: `src/components/now-view.tsx`
- Live source: `memory/core/projects.yaml → <repo>/goals/*.md`
- QA URL: 격리 개발 서버 `127.0.0.1:3021` · 제품 포트 계약 `3001`은 변경하지 않음

## 판정

승인된 R3의 한 화면 한 주인공, `GOAL → TASK → NEXT`, 54px 최대 H1, 선 기반 근거 영역, 주요 행동 하나를 production에 옮겼다. 기존 상단 내비게이션과 다른 네 화면은 유지했다. 활성 Goal을 찾는 범위는 Brain 단일 `goals/`가 아니라 정본 계층인 `projects.yaml → active project → local repo/goals`로 바로잡았다.

## 필수 품질 게이트

| 영역 | 결과 | Evidence |
| --- | --- | --- |
| Typography | PASS | 5개 폭 모두 body `16px`, NOW 내부 최소 leaf text `14px`, H1 `36px → 54px` |
| Contrast | PASS | body `13.51:1`, secondary `5.28:1`, white/primary button `5.83:1`, focus/background `4.89:1` |
| Responsive | PASS | 유효 viewport `360·432·768·1280·1440px` 모두 document horizontal overflow `0` |
| Primary action | PASS | 5개 폭 모두 `176×44px`, focusable, Enter 입력으로 프로젝트 탭 전환 |
| H1 hierarchy | PASS | 각 live·selection-required·empty·error·loading 상태에서 visible H1 정확히 1개 |
| Icons | PASS | `lucide-react`의 `ArrowRight`, `Flag`, `Loader2`, `RotateCcw`; emoji·CSS art·handwritten SVG 없음 |
| Console | PASS | 별도 live 탭에서 console error `0`, warning `0` |
| Build gates | PASS | `tsc --noEmit --incremental false`, ESLint 오류 0, Node test 71/71, Next production build |
| Preservation | PASS | 승인 source와 최종·상태별 캡처를 프로젝트 경로에 보존 |

## 뷰포트 Evidence

| Viewport | Overflow | H1 | 최소 텍스트 | 주요 버튼 | Capture |
| ---: | ---: | ---: | ---: | ---: | --- |
| 360×900 | 0 | 1 | 14px | 176×44 | `captures/goal-16/goal16-live-360.png` |
| 432×900 | 0 | 1 | 14px | 176×44 | `captures/goal-16/goal16-live-432.png` |
| 768×900 | 0 | 1 | 14px | 176×44 | `captures/goal-16/goal16-live-768.png` |
| 1280×900 | 0 | 1 | 14px | 176×44 | `captures/goal-16/goal16-live-1280.png` |
| 1440×900 | 0 | 1 | 14px | 176×44 | `captures/goal-16/goal16-live-1440.png` |

Playwright의 `432` resize가 이 환경에서 `innerWidth 433`으로 보정되어, raw width `431`을 사용해 실제 `innerWidth 432`를 확인했다. 화면을 축소한 것이 아니라 responsive layout을 다시 계산했다.

## 상태·선택 계약

| 상태 | 기대 | 결과 | Capture |
| --- | --- | --- | --- |
| live single Goal | 첫 미완료 Completion Check와 실제 index·progress | Goal 22, Task 2/5, 완료 1/5 | `captures/goal-16/goal16-live-1280.png` |
| multiple active Goals | Task 자동 선택 금지, 사람 결정 요청 | 두 Goal 이름만 표시, fixture Task 본문 노출 0 | `captures/goal-16/goal16-selection-required-1280.png` |
| empty | 문서 Todo·대기 Goal을 current로 승격 금지 | `진행할 작업이 없습니다.` | `captures/goal-16/goal16-empty-1280.png` |
| source error | 원인과 재시도 | `작업 원장 확인이 필요합니다.` + `다시 불러오기` | `captures/goal-16/goal16-error-1280.png` |
| loading | 추정 Task 없이 읽기 상태 | `지금 할 일을 확인하는 중입니다.` + named spinner | `captures/goal-16/goal16-loading-1280.png` |

단위 테스트는 Completion Check 진행률·원래 순서·모두 완료·legacy `Goal n 완료 대기`, 활성 Goal 0/1/복수, priority 자동 선택 금지를 검증한다.

## Same-state visual comparison

- Source: `now-mova-r3-1440.png`
- Implementation: `captures/goal-16/goal16-live-1440.png`
- 유지: 밝은 중립 작업면, blue taxonomy, 54px H1, 상태선 오른쪽 주요 행동, 2열 근거, NEXT.
- 의도적 차이: prototype의 가상 vNext 전역 탐색은 노출하지 않고 현재 production 5탭을 유지했다. 데이터는 예시 Goal 21가 아니라 실제 local active Goal 22를 사용했다.
- 직접 이미지 검토 결과: P0 0, P1 0.

## 적대적 교차검증

### 주장과 근거

1. 현재 Task를 임의 선택하지 않는다 → `selectNowTask`의 active Goal group cardinality와 복수 fixture.
2. Task index·progress가 실제다 → `parseGoalCompletionTasks`가 완료 항목까지 세고 미완료 원래 index를 보존하는 단위 테스트 및 live API Goal 22 `2/5·1 done`.
3. 프로젝트 계층을 따른다 → `loadProjectsDocument`와 active project filter, `YOHAN_REPOS_ROOT/<safe slug>/goals` 수집, live scope `18 configured active / 7 local`.
4. 경로 밖을 읽지 않는다 → `isSafeRepoSlug` allowlist 이후에만 repo path를 조합; 브라우저 payload는 project key와 상대경로만 포함.
5. 기존 화면을 깨지 않는다 → 상단 `ViewTabs` 미변경, 다른 view component 미변경, production build 성공.

### 발견·보정

- HIGH · 프로젝트 key를 바로 filesystem join하면 악성 key가 repo root 밖을 가리킬 수 있음 → 기존 `isSafeRepoSlug` allowlist를 재사용해 fail-closed로 보정.
- MEDIUM · `/api/todos`가 Brain root만 읽어 현재 프로젝트 Goal을 읽는다는 초기 가정이 틀림 → `projects.yaml → active local repo/goals`로 source를 교정하고 local coverage를 UI에 표시.
- MEDIUM · `Goal 전체 보기`가 특정 Goal deep-link처럼 보이나 실제로는 프로젝트 탭 이동 → `프로젝트에서 확인`으로 정확히 수정.

### 남은 P2·외부 데이터 위험

- 360px에서 기존 상단 탭은 내부 horizontal scroll을 사용한다. document overflow는 0이고 주요 행동은 보이지만, vNext 전역 탐색 전환 전까지 기존 셸 제약이 남는다.
- 실제 Goal 22는 frontmatter `IN_PROGRESS`지만 본문에는 보류라고 적혀 있다. UI는 정본 status를 보존해 `진행`으로 표시하며 Brain 기존 파일은 이 Goal 범위에서 수정하지 않았다.
- active configured project 18개 중 현재 PC local repo는 7개다. 화면에 `로컬 7 / 18`을 표시하며 미클론 프로젝트 상태를 성공으로 위장하지 않는다.
- 기존 Next NFT 과추적 경고 1건은 `next.config.ts → memory.ts → search route` 경로이며 Goal 22 변경과 무관하다. build는 성공했다.
- Orca 앱 PID가 바뀐 뒤 runtime·graph가 계속 `starting`이라 새 critic worker를 만들지 않았다. 로컬 `cross-check` 계약으로 주장·근거·반례를 검토했다.

final result: passed
