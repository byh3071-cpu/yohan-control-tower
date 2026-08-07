# F005·F006 미션 드릴다운과 정합성 lint

날짜: 2026-08-07
브랜치: `agent/control-tower-mvp`
Goal: `goals/3-mission-project-drilldown-lint.md`

## 의도

Home의 미션 숫자를 장식으로 끝내지 않고 `미션 → 프로젝트(레포) → Task(goals)`로 이어지는 실제 관제 흐름을 만든다. 동시에 미션 배속과 Goal 형식의 결함을 자동 수정하지 않고 사람이 판단할 수 있는 제안으로 표면화한다.

## 구현

- `src/lib/ecosystem-projects.ts`: projects.yaml·Goal frontmatter·Completion Check 공용 parser.
- `GET /api/projects`: 5개 미션별 배속 프로젝트, 로컬·미클론, Task 상태 요약.
- `GET /api/projects/[slug]`: 안전한 slug 검증, 레포 1개의 Goal 원시 status·priority·진행률.
- `ProjectView`: Home 선택 미션 유지, 로컬 우선 목록, 미클론 명시, Task 상세.
- `GET /api/lint`: 미배정 프로젝트, 미등재 로컬 레포, Goal frontmatter 위반과 severity 집계.
- `.git` 파일 worktree와 origin repo명≠로컬 dir인 변형 clone은 lint 대상에서 제외.
- 표준 Goal status 4값 밖 값은 warning이며 레포별 확장은 `config/goal-status-extensions.yaml`에서 허용.
- Home에는 error+warning인 actionable 결함 수만 배지로 표시.

## 검증

- Node test 35/35 통과.
- typecheck·lint·production build 통과.
- Playwright desktop 1440×900, mobile 390×844 통과.
- 두 viewport 모두 미션 버튼 5개, Home 선택 미션 `aria-pressed=true`, Goal 진행률 `2/3 · 67%`, 미클론 안내, Home lint 배지 표시.
- body/document 가로 overflow 0, console error 0.
- 중단된 Next dev가 생성한 `.next/dev/types/validator.ts` 손상 캐시는 `/tmp/yohan-next-dev-corrupt.yf7R0e/dev`로 이동해 보존했고, production typecheck를 다시 통과했다.
- VHK 2.12.0 `goal done --id 3`이 공통 게이트와 고유 검증 7개를 재실행한 뒤 Goal 3를 DONE으로 전이했다.
- `goal next`는 모든 Goal 완료를 출력하면서 과거 IN_PROGRESS next-task를 유지해 `docs/state/next-task.md`를 활성 Goal 없음으로 교정했다.

## 회색지대와 경계

- lint는 제안만 하며 Brain·projects.yaml·Goal을 자동 수정하지 않는다.
- archived·separate_track 미배정은 info라 Home actionable 배지에서 제외한다.
- 실제 휴대폰 PWA·알림·터치는 별도 범위다.
- 다음 제품 축은 Calendar 또는 Skill Registry 중 하나만 선택한다.
