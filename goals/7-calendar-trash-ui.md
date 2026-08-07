---
vhk_format: 1
type: goal
id: 7
title: Calendar 삭제 확인과 휴지통 복구 UI
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 7: Calendar 삭제 확인과 휴지통 복구 UI

## Objective

사용자가 일정·할 일을 실수로 영구 소실하지 않도록 삭제 범위를 확인하고 휴지통으로 이동하며, 즉시 또는 이후 휴지통 목록에서 복구할 수 있어야 한다.

## Scope

- 선택일 패널과 목록 카드에 휴지통 이동 버튼을 제공한다.
- 별도 확인 Dialog에서 항목 제목과 반복 전체 이동 범위를 표시한다.
- 성공 후 활성 목록을 다시 읽고 즉시 `되돌리기` 동작을 제공한다.
- 상단 `휴지통` 버튼에서 삭제 항목을 최신순으로 보고 복구할 수 있다.
- 휴지통 읽기·이동·복구의 loading·empty·error 상태를 숨기지 않는다.
- 데스크톱과 모바일에서 Dialog와 버튼이 잘리지 않아야 한다.

## Completion Check

- [x] 일정·할 일 카드에서 휴지통 이동 확인 Dialog를 열 수 있다.
- [x] 반복 항목에는 반복 전체가 이동됨을 명시한다.
- [x] 확인 전에는 DELETE 요청이 전송되지 않는다.
- [x] 이동 후 월간·목록에서 사라지고 즉시 되돌리기로 복구된다.
- [x] 휴지통 목록에서 삭제 시각·제목·종류를 확인하고 복구할 수 있다.
- [x] loading·empty·API error가 명시적으로 표시된다.
- [x] Playwright가 생성→이동→즉시 복구→재이동→휴지통 복구를 검증한다.
- [x] 1440×900·390×844에서 overflow 0, 콘솔 오류 0을 확인한다.
- [x] typecheck, test, lint, build가 통과한다.

## Forbidden

- 영구 삭제 버튼 또는 `unlink`
- 확인 Dialog 없이 DELETE 전송
- 반복 발생 한 번만 지워진 것처럼 표시
- 성공 전 낙관적으로 화면에서 제거
- 모바일 일정 우선 재배치를 Goal 7에 섞기
- main 직접 push 또는 자동 merge

## Evidence

- `src/components/calendar-view.tsx`: 확인 Dialog, 반복 전체 경고, 성공 후 즉시 되돌리기, 휴지통 목록·복구 및 loading·empty·error 상태를 구현했다.
- `src/app/api/calendar/route.ts`, `src/lib/calendar.ts`: 확인된 DELETE는 원본 Markdown을 `trash/`로 이동하고 PATCH `restore_item`은 같은 원본을 복구한다.
- Playwright 실제 브라우저 흐름: 반복 일정 생성 → 확인 Dialog → 이동 → 즉시 되돌리기 → 재이동 → 휴지통 목록 복구가 통과했다.
- Playwright 계측: 확인 전 DELETE `0`, 확인된 DELETE 총 `2`, 이동 직후 활성 항목 `0`, 두 복구 후 활성 항목 각각 `1`.
- 시각 검증: `calendar-goal7-delete-desktop.png`, `calendar-goal7-trash-desktop.png`, `calendar-goal7-trash-mobile.png`, `calendar-goal7-delete-mobile.png`에서 Dialog 위계·간격·버튼·잘림을 직접 확인했다.
- 1440×900 및 390×844에서 body/document width가 viewport와 일치했고 browser console/page error는 `0`이었다.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` 통과 후 `scripts/check-goal-7.mjs`로 재검증한다.
