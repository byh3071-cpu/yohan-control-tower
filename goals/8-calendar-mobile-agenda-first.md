---
vhk_format: 1
type: goal
id: 8
title: Calendar 모바일 선택일 일정 우선 배치
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 8: Calendar 모바일 선택일 일정 우선 배치

## Objective

휴대폰에서 Calendar를 열었을 때 월간 격자를 먼저 끝까지 훑지 않아도 오늘 선택한 일정·할 일을 첫 화면에서 바로 확인하고 조작할 수 있어야 한다.

## Scope

- 모바일 월간 보기에서 선택일 패널을 월간 격자보다 먼저 배치한다.
- 선택일 패널의 일정·할 일, 수정, 휴지통 이동, 완료 토글 기능을 그대로 유지한다.
- 모바일 빈 상태의 과도한 세로 여백을 줄인다.
- 데스크톱에서는 월간 격자 왼쪽, 선택일 패널 오른쪽의 기존 2열 구조를 유지한다.
- 390×844 및 1440×900 실제 브라우저에서 첫 화면과 반응형 전환을 검증한다.

## Completion Check

- [x] 390×844 월간 보기에서 선택일 패널이 월간 격자보다 앞에 표시된다.
- [x] 선택일에 있는 일정·할 일과 주요 조작을 스크롤 전에 확인할 수 있다.
- [x] 모바일 빈 선택일 패널이 불필요하게 화면을 크게 차지하지 않는다.
- [x] 1440×900에서는 월간 격자가 왼쪽, 선택일 패널이 오른쪽에 유지된다.
- [x] 반응형 DOM 순서가 키보드·스크린리더의 시각 순서와 일치한다.
- [x] 390×844·1440×900에서 가로 overflow 0, 콘솔 오류 0을 확인한다.
- [x] Playwright 스크린샷을 직접 검토해 간격·위계·잘림을 확인한다.
- [x] typecheck, test, lint, build가 통과한다.

## Forbidden

- 모바일에서 월간 격자 또는 선택일 기능 제거
- CSS 시각 순서만 바꿔 DOM 탐색 순서와 다르게 만들기
- 데스크톱 2열 레이아웃 회귀
- Goal 8에 알림·동기화·PWA 설치 기능 섞기
- main 직접 push 또는 자동 merge

## Evidence

- `src/components/calendar-view.tsx`: 선택일 `aside`를 DOM에서 월간 격자보다 먼저 두고 `order-1 lg:order-2`, 격자는 `order-2 lg:order-1`로 배치했다.
- 접근성 이름 `선택한 날짜 일정`을 추가해 키보드·스크린리더 탐색 순서와 모바일 시각 순서를 일치시켰다.
- 모바일 빈 상태를 `min-h-32 sm:min-h-52`로 조정해 작은 화면에서 약 80px 줄이고 월간 격자 시작점을 첫 화면에 노출했다.
- Playwright 390×844: 선택일 패널 y=`444.5`, bottom=`698.75`, 월간 격자 y=`714.75`; 일정·할 일·수정·휴지통 이동 버튼이 모두 스크롤 전 표시됐다.
- Playwright 모바일 빈 상태: 선택일 패널 높이 `243.5`, 월간 격자 y=`704`로 첫 화면에서 다음 정보 구조가 보였다.
- Playwright 1440×900: 월간 격자 x=`144`, 선택일 패널 x=`996`, 같은 y=`308`로 기존 좌·우 2열이 유지됐다.
- 390×844 및 1440×900에서 body/document width가 viewport와 일치했고 browser console/page error는 `0`이었다.
- `calendar-goal8-mobile.png`, `calendar-goal8-mobile-empty.png`, `calendar-goal8-desktop.png`를 직접 검토해 위계·간격·잘림을 확인했다.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`를 통과했으며 `scripts/check-goal-8.mjs`로 재검증한다.
