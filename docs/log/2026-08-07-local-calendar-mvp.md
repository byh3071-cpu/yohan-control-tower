# 2026-08-07 — 로컬 Calendar MVP

## 결정

- Calendar를 Skill Registry보다 먼저 구현한다.
- 6번째 상단 탭은 만들지 않고 Home 안에 `개요 / 캘린더` 전환을 둔다.
- 원장은 `YOHAN_CALENDAR_ROOT/items/*.md`의 항목별 Markdown으로 정했다(ADR-002).
- Calendar `task`는 날짜형 개인 실행 항목, 각 레포 Goal은 프로젝트 실행 정본이며 자동 동기화하지 않는다.
- PWA 설치·OS 알림·외부 Calendar 동기화·Notion 337행 마이그레이션은 후속 Goal이다.

## 구현

- `calendar.ts`: 일정·할일 스키마 검증, daily·weekly·monthly 반복 확장, 손상 파일 issue, 2초 캐시.
- 반복 할일 완료는 원본 전체 status를 바꾸지 않고 `completed_dates`에 발생일만 추가한다.
- `/api/calendar`: loopback GET, same-origin POST·PATCH, 요청 크기·닫힌 enum·날짜·시간 검증.
- `CalendarView`: 월간·목록 보기, 선택일 agenda, 일정·할일 생성, 완료·재개.
- Home의 삶·기반 미션과 Calendar 안내가 Home 내부 Calendar를 연다.
- 기존 same-origin POST가 Chromium의 Origin 생략을 거부하던 결함을 Fetch Metadata+Referer 검증으로 수정했다.

## 검증

- 단위·회귀 테스트 40/40 통과. Calendar 신규 5건과 same-origin 브라우저 헤더 회귀 포함.
- typecheck·lint·production build 통과.
- Playwright 1440×900·390×844에서 일정과 매일 반복 할일 생성, 월간·목록 표시, 해당 발생일 완료를 확인했다.
- 상단 탭 5개, 달력 셀 42개, 데스크톱·모바일 가로 overflow 0, 콘솔 오류 0.
- Cloud browser는 localhost를 `ERR_BLOCKED_BY_CLIENT`로 차단해 같은 production 서버를 로컬 Playwright로 검증했다.
