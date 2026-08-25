# 작업 형제 보기 takeover 인수인계

- 날짜: 2026-08-25 (Asia/Seoul)
- 상태: epoch 4 takeover 시작
- 기준 브랜치: `byh3071-cpu/control-tower-work-siblings-scout`
- 기준 HEAD: `3e6c38ecd8a29a13c861a4796dbd655f46081777`
- 격리 상태: 시작 시 clean, `.vhk/HARD_STOP` 없음
- 라우팅: **L** — 디자인 브랜치 통합과 Goal 재번호화 뒤 작업 형제 보기·API·테스트·브라우저 QA까지 7개 이상 파일을 변경한다.
- 실행 provider: `orca-ready` — coordinator가 생성한 격리 Dispatch 안에서만 작업하며 commit·push·PR·master merge·배포는 하지 않는다.

## Orca 최소 영수증

- epoch: `4`
- Run: `run_725a82dd750c` · coordinator terminal `term_a71c4f3b-cd72-4e86-9c56-2091be35aa32`
- Task: `task_ef3a1828ceb3`
- Dispatch: `ctx_5b8adfe0de27`
- worker terminal: `term_0b05a3f6-2328-4e0d-a84d-4a5ab9de66de`
- 범위: 이 저장소의 승인된 yohan-control-tower Goal만 구현. MOVA와 다른 저장소는 읽기·쓰기 모두 범위 밖이다.

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
    "topLevelTabs": 5,
    "workSurfaces": ["todo", "calendar", "projects"],
    "visualShell": "NOW-R3 bright neutral",
    "writeBoundary": "Calendar owner only"
  },
  "approvedSources": [
    "codex/control-tower-design-direction@c176c3b:docs/design/control-tower-vnext/design-spec.md",
    "codex/control-tower-design-direction@c176c3b:docs/design/control-tower-vnext/taste-profile.md",
    "codex/control-tower-design-direction@c176c3b:docs/design/control-tower-vnext/work-item-language-contract.md",
    "codex/control-tower-design-direction@c176c3b:docs/design/control-tower-vnext/surface-set-v2.md",
    "codex/control-tower-design-direction@c176c3b:docs/design/control-tower-vnext/captures/goal-16/"
  ]
}
```

## 작업 컨텍스트 요약

- goal: Goal 23 — 기존 쓰기 경계를 보존한 작업 형제 보기 구현
- user and target screen: 로컬 관제탑 사용자, 상위 `작업` 안의 `할 일 / 일정 / 프로젝트`
- approved visual source: NOW-R3 shell evidence와 `surface-set-v2.md`의 Work/Todo 구조
- selected source of truth: 현재 승인 요청 → 이 프로젝트 Git → design ref `c176c3b`; media/common taste/golden은 승인된 ref 밖에서 새로 추론하지 않는다.
- applicable project rules: `AGENTS.md`, `RULES.md`, `goal-cycle`, `design-to-html`, Next.js 16 로컬 문서
- acceptance criteria: query canonicalization, 형제 보기 한 클릭 전환, 데이터·쓰기 경계 보존, partial/fail-closed 상태, 키보드·focus, 5개 viewport overflow 0, 전체 gate와 Goal 23 완료

## 현재 Phase · Goal · Completion Check

- Phase: 관제탑 vNext 작업 화면 전환
- Goal: 23 작업 형제 보기
- Completion Check: 디자인 ref를 master 운영 변경과 충돌 없이 통합하고 Goal 21·22·23 구조를 만든다.

## 통합·VHK 영수증

- design Goal `15 → 21`, NOW-R3 Goal `16 → 22`로 파일·frontmatter·H1·checker·현재 디자인 문서 참조를 재번호화했다.
- 기존 중복 Goal 2 중 Focus Feed UI Goal을 빈 번호 14로 옮겨 `goal list`의 중복 ID를 0으로 만들었고, Goal 2·13의 master `DONE` 상태는 보존했다.
- 역사 증거 `docs/design/control-tower-vnext/captures/goal-16/`과 `docs/log/2026-08-24-goal-16-now-r3.md`는 당시 ID를 나타내므로 이름을 바꾸지 않는다. 현재 Goal 22의 역사 캡처·로그라는 mapping만 이 문서와 현재 디자인 QA에 남긴다.
- `goal sync`가 Goal 14·23 checker를 만들었고 `goal next` 뒤 `goal peek/list`는 Goal 23만 `IN_PROGRESS`, Goal 1–22는 모두 `DONE`으로 확인했다.
- NOW-R3 회귀 테스트 `goal-tasks`, `now-task`, `calendar-route` 8건은 Goal 23 구현 전에 통과했다.

## 보존·금지

- master 운영 변경 5 commits와 Goal 15·16 checker를 보존한다.
- master root의 기존 dirty handoff 4파일과 design worktree의 `.vhk/context.md`는 건드리지 않는다.
- 기존 `docs/operations/current-workstreams.md`와 `docs/operations/handoffs/2026-08-24-main-conductor-handoff.md`는 수정하지 않는다.
- commit·push·PR·PR Ready·master/main merge·배포·publish·삭제·전역 설치·인증/시크릿 변경·Notion 쓰기를 하지 않는다.
