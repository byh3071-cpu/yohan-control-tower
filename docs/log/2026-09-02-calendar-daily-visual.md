# 2026-09-02 — 일정 일상 표면 시각과 빠른 추가

- Phase: 일상 표면 입히기
- Goal: 25 일정 시각과 빠른 추가
- 브랜치: `cursor/four-lane-sketches-2f80`
- PR: https://github.com/byh3071-cpu/yohan-control-tower/pull/40

## 결과

승인된 네 레인 시안의 일정 껍질을 기존 Calendar 원장 위에 입혔다. 토큰은 `src/lib/daily-visual.ts`와 `[data-surface="daily"]` 한 곳이고, pill 색은 `kind`만 쓴다. 선택일 빠른 추가는 비어 있지 않은 제목만 `kind=task`로 POST 하며, 원형 체크 완료는 Calendar PATCH만 호출한다.

## 한 일

- `daily-visual` 토큰 SoT와 kind allowlist pill, 빠른 추가 payload builder
- Work 형제 네비를 작은 라벨 + rose 밑줄로 맞춤. URL·surface 계약은 Goal 23 유지
- Calendar 월간 pill, 선택일 테두리, 선택일 H1, 원형 완료, `+ 일정 추가`, 모바일 FAB
- 카테고리 점 줄·다가 span·Calendar 스키마 확장 없음

## 검증

- `node --import tsx --test src/lib/daily-visual.test.ts src/lib/calendar-route.test.ts src/lib/calendar.test.ts` PASS
- `npm run typecheck`, `npm run lint` PASS
- Chrome 1440·768·360: overflowX 0, H1 1개(`9월 27일 일요일`), `+ 일정 추가` ≥44px, 카테고리 점/span 없음
- 빈 제목 Enter → fetch 0건. 제목 있는 빠른 추가 → `POST /api/calendar` `{kind:task, date:2026-09-27}`
- `VHK_GATES_SKIP_DEEP=1 node scripts/check-goal-25.mjs` PASS
- 전체 `npm test`는 Goal 24 run-command Windows npm 경로 2건이 Linux 호스트에서 실패한다. Goal 25 범위 밖.
