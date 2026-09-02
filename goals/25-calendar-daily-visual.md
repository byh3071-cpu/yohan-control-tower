---
vhk_format: 1
type: goal
id: 25
title: 일정 일상 표면 시각과 빠른 추가
status: NOT_STARTED
priority: P0
size: M
---

# Goal 25: 일정 일상 표면 시각과 빠른 추가

## Objective

승인된 네 레인 시안의 일정 화면을 기존 Calendar 원장·쓰기 계약 위에 입혀, 월간 격자·선택일·원형 체크·빠른 추가가 실제 `/api/calendar`로 동작하게 한다.

## Scope

- 시각 SoT: `docs/prototypes/four-lanes/index.html` 일정 뷰, `captures/screen-1.png`.
- 명세: `docs/design/control-tower-vnext/four-lanes-implementation-spec.md` §일정, ADR-004.
- `src/lib/daily-visual.ts`와 `[data-surface="daily"]` 토큰을 추가한다.
- `WorkView` 형제 네비를 시안 문법(작은 라벨 + rose 밑줄)으로 맞춘다. URL·surface 계약은 Goal 23을 유지한다.
- `CalendarView` 월간 pill, 선택일 테두리, 우측 선택일 H1, 원형 완료, `+ 일정 추가`, 선택일 빠른 추가(Enter → `kind=task`).
- pill 색은 `kind`만 사용한다. category 필드·다가 span·카테고리 점 줄을 추가하지 않는다.
- 기존 same-origin 쓰기, 409, 휴지통 rename, 월간 월요일 시작, 모바일 선택일 우선을 보존한다.

## Completion Check

- [ ] `daily-visual` 토큰이 한 모듈에 있고 Calendar·Work 형제가 그 값만 쓴다.
- [ ] 빠른 추가가 선택일·비어 있지 않은 제목으로 Calendar task를 생성하고, 빈 제목은 요청을 보내지 않는다.
- [ ] 원형 체크 완료가 Calendar PATCH만 호출하고 Goal 완료 API를 호출하지 않는다.
- [ ] 기존 calendar route·optimistic concurrency·trash 테스트가 통과한다.
- [ ] 카테고리 점 줄과 다가 span 마크업이 DOM에 없다.
- [ ] 1440·768·360에서 일정 화면 가로 overflow 0, H1 1개(선택일), 주요 추가 표적 ≥44px.
- [ ] typecheck, lint, test, build, `vhk goal check --id 25`가 통과한다.

## Forbidden

- Calendar frontmatter에 category·end_date 추가
- Goal Completion Check와 Calendar 완료 동기화
- 에이전트 일정 자동 생성
- 상위 탭 이름 변경, `지금` 화면 재색
- Pretendard CDN, 절대경로 하드코딩
- commit·push·PR Ready·master merge·deploy를 이 Goal 문서가 승인하는 것으로 해석

## Evidence Plan

- `src/lib/daily-visual.ts`
- Calendar 빠른 추가·kind pill 단위 테스트
- 기존 `src/lib/calendar-route.test.ts` 회귀
- `docs/log/YYYY-MM-DD-calendar-daily-visual.md`
- `scripts/check-goal-25.mjs` (`vhk goal sync` 백필)
