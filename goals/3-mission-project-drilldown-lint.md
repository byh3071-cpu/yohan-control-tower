---
vhk_format: 1
type: goal
id: 3
title: 미션 프로젝트 드릴다운과 정합성 lint
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 3: 미션 프로젝트 드릴다운과 정합성 lint

## Objective

프로젝트 탭을 `미션 → 프로젝트(레포) → Task(goals)` 3단 읽기 전용 관제 화면으로 전환하고, 미션 배속·로컬 레포·Goal frontmatter의 정합성 결함을 숨기지 않고 표시한다.

## Scope

- Brain `memory/core/projects.yaml`의 active taxonomy만 읽는다.
- Home 미션 카드를 누르면 프로젝트 탭의 해당 미션으로 이동한다.
- 프로젝트 목록은 로컬·미클론과 Goal 상태를 구분한다.
- Task 상세는 각 레포 `goals/*.md`의 원시 status·priority와 완료 조건 진행률을 표시한다.
- lint는 미션 미배정 프로젝트, `projects.yaml` 미등재 로컬 레포, Goal frontmatter 위반을 검사한다.
- Git worktree와 변형 디렉터리는 미등재 레포 검사에서 제외한다.
- 기본 4개 Goal status 외 값은 error가 아닌 warning이며, 레포별 확장 허용 설정을 지원한다.
- AI는 수정안을 제안할 수만 있고 Brain·프로젝트 파일을 자동 수정하지 않는다.

## Completion Check

- [x] 프로젝트 탭에서 정확히 5개 미션을 선택할 수 있다.
- [x] 미션 선택 시 배속 프로젝트가 로컬·미클론 상태와 함께 표시된다.
- [x] 로컬 프로젝트 선택 시 Task(goals) 상세와 완료 조건 진행률을 표시한다.
- [x] Home 미션 카드가 선택한 미션을 유지한 채 프로젝트 탭으로 이동한다.
- [x] `/api/projects`와 `/api/projects/[slug]`가 setup·error·unknown 상태를 구분한다.
- [x] `/api/lint`가 F006 세 결함군과 severity별 수를 반환한다.
- [x] Home에 actionable lint 결함 수 배지가 표시된다.
- [x] worktree·변형 디렉터리 제외와 확장 status 정책이 테스트로 고정된다.
- [x] typecheck, test, lint, build가 통과한다.
- [x] Playwright 1440×900·390×844 시각 QA와 미션→프로젝트→Task 상호작용 검증을 완료한다.

## Forbidden

- Brain 기존 파일 수정
- Goal status·미션 배속 자동 변경
- 여섯 번째 상단 탭 추가
- 미클론 프로젝트를 Task 0으로 표시
- main 직접 push 또는 자동 merge

## Evidence

- 공용 `ecosystem-projects.ts`에서 active taxonomy와 Goal frontmatter·Completion Check를 읽고 F004·F005·F006이 같은 parser를 사용한다.
- F005 `/api/projects`·`/api/projects/[slug]`와 `ProjectView`가 정확히 5개 미션, 로컬 우선 프로젝트 목록, Goal 상세, 미클론 상태를 표시한다.
- F006 `/api/lint`가 미션 미배정·미등재 로컬 레포·Goal frontmatter 위반을 검사하고 worktree·원격 이름이 다른 변형 clone을 제외한다.
- 표준 4 status 밖 값은 warning으로 보존하며 `config/goal-status-extensions.yaml`에서 레포별 허용 어휘를 관리한다.
- 테스트 35/35, typecheck, lint, build를 통과했다.
- production Playwright 1440×900·390×844에서 Home lint 배지, 선택 미션 유지, Goal `2/3 · 67%`, 미클론 안내, 가로 overflow 0, 콘솔 오류 0을 확인했다.
