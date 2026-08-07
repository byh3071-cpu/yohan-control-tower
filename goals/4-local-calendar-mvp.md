---
vhk_format: 1
type: goal
id: 4
title: 로컬 Calendar MVP
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 4: 로컬 Calendar MVP

## Objective

관제탑 Home 안에서 일정과 할 일을 명확히 구분해 기록하고, 월간 캘린더와 날짜별 목록으로 확인하며, 반복 항목을 로컬 파일 원장에서 안전하게 이어서 관리한다.

## Scope

- 별도 6번째 상단 탭을 만들지 않고 Home 내부에 `개요 / 캘린더` 전환을 둔다.
- Calendar 원장은 `YOHAN_CALENDAR_ROOT/items/*.md`의 항목별 Markdown 파일이다.
- 일정(`event`)과 할 일(`task`)을 타입·시각 표현·완료 행동으로 구분한다.
- 월간 캘린더와 선택 날짜 목록을 같은 원장에서 파생한다.
- 반복은 `none | daily | weekly | monthly`와 interval·종료일을 지원한다.
- 반복 할 일은 원본 전체가 아니라 선택한 발생일만 완료 처리한다.
- UI에서 일정·할 일을 생성하고 할 일을 완료·재개할 수 있다.
- 원장 미설정·손상 파일·입력 오류를 빈 목록으로 위장하지 않는다.
- 휴대폰 PWA 설치·백그라운드 알림·외부 Calendar 양방향 동기화는 후속 Goal로 분리한다.

## Completion Check

- [x] Home에서 `개요 / 캘린더`를 전환할 수 있고 상단 탭은 정확히 5개다.
- [x] 월간 그리드에서 일정과 할 일이 서로 다른 표현으로 보인다.
- [x] 날짜를 선택하면 그날의 시간순 일정과 할 일 목록이 표시된다.
- [x] 일정·할일 생성 폼이 날짜·시간·반복 규칙을 검증해 로컬 Markdown 파일을 만든다.
- [x] 비반복 및 반복 할 일을 발생일 단위로 완료·재개할 수 있다.
- [x] `/api/calendar`가 GET·POST·PATCH를 제공하고 로컬 same-origin 쓰기만 허용한다.
- [x] 미설정 root, 손상 파일, 잘못된 날짜 범위가 명시적인 상태·오류로 표시된다.
- [x] 반복 확장·월말·완료 예외·입력 검증이 테스트로 고정된다.
- [x] typecheck, test, lint, build가 통과한다.
- [x] Playwright 1440×900·390×844에서 생성→표시→완료 흐름과 가로 overflow 0·콘솔 오류 0을 확인한다.

## Forbidden

- Brain 기존 파일 또는 Notion 일정 DB 수정
- 6번째 상단 탭 추가
- DB·가짜 일정·silent fallback 추가
- 반복 할 일 1회 완료로 전체 반복 원본을 DONE 처리
- 외부 Calendar 양방향 동기화·PWA 알림을 이번 Goal에 섞기
- main 직접 push 또는 자동 merge

## Evidence

- `YOHAN_CALENDAR_ROOT/items/*.md`에 일정·할일을 항목별 Markdown으로 쓰고, 손상 파일은 `issues[]`로 분리해 표시한다.
- `/api/calendar`의 GET·POST·PATCH와 `CalendarView`가 월간·목록, 생성, 완료·재개를 연결한다.
- daily·weekly·monthly 반복과 31일 월말 skip, 반복 할일의 `completed_dates` 발생일 예외를 테스트로 고정했다.
- Chromium이 same-origin POST에서 Origin을 생략하는 실동작을 발견해 loopback+Fetch Metadata+Referer 검증으로 보완했다.
- 테스트 40/40, typecheck, lint, production build, docs 경로 검증을 통과했다.
- production Playwright 1440×900·390×844에서 상단 탭 5개, 달력 셀 42개, 생성→반복 표시→발생일 완료, 가로 overflow 0, 콘솔 오류 0을 확인했다.
