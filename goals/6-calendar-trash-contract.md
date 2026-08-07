---
vhk_format: 1
type: goal
id: 6
title: Calendar 휴지통 저장 계약과 API
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 6: Calendar 휴지통 저장 계약과 API

## Objective

일정·할 일을 영구 삭제하지 않고 로컬 휴지통으로 안전하게 이동하며, 앱을 다시 열어도 목록 확인과 복구가 가능한 API 계약을 만든다.

## Scope

- 활성 원장은 `items/*.md`, 휴지통은 `trash/*.md`로 분리한다.
- 휴지통 이동은 원본 Markdown 내용을 바꾸지 않는 같은 파일시스템 rename을 사용한다.
- 휴지통 파일명에는 원본 ID·삭제 시각·충돌 방지 식별자를 넣는다.
- DELETE는 `expectedUpdatedAt` 충돌 검사를 통과한 원본만 이동한다.
- GET `view=trash`는 휴지통 항목과 삭제 시각을 반환한다.
- PATCH `restore_item`은 같은 ID의 활성 파일이 없을 때만 복구한다.
- 모든 쓰기는 기존 local same-origin 경계를 그대로 사용한다.

## Completion Check

- [x] `items`의 Markdown이 내용 변경 없이 `trash`로 이동한다.
- [x] 휴지통 목록이 ID·제목·종류·원본 날짜·삭제 시각·복구 키를 반환한다.
- [x] DELETE가 오래된 `expectedUpdatedAt`과 잘못된 ID를 거부한다.
- [x] PATCH `restore_item`이 원본 경로로 복구하고 활성 캐시를 비운다.
- [x] 같은 ID의 활성 항목이 있으면 복구 충돌을 명시적으로 거부한다.
- [x] API GET·DELETE·PATCH가 setup·400·403·409·500을 구분한다.
- [x] 이동·목록·복구·충돌·경로 traversal이 테스트로 고정된다.
- [x] typecheck, test, lint, build가 통과한다.

## Forbidden

- `unlink`로 Calendar 원본 영구 삭제
- 휴지통 파일의 원문 재직렬화
- 경로 문자열을 그대로 파일 경로로 사용
- 복구 시 기존 활성 파일 덮어쓰기
- 삭제·복구 UI 또는 모바일 레이아웃을 Goal 6에 섞기
- main 직접 push 또는 자동 merge

## Evidence

- `trashCalendarItem`은 `expectedUpdatedAt`을 확인한 뒤 원본 Markdown을 재직렬화하지 않고 `items/`에서 `trash/`로 rename한다.
- 휴지통 복구 키는 원본 ID·13자리 삭제 시각·UUID만 허용하는 정규식으로 검증하며 경로 traversal을 거부한다.
- `listCalendarTrash`는 삭제 시각 내림차순 목록과 손상 파일 `issues[]`를 반환하고, `restoreCalendarItem`은 활성 파일 충돌 시 409로 중단한다.
- Route Handler 회귀 테스트가 same-origin 403, 오래된 삭제 409, 휴지통 GET, PATCH 복구, 활성 목록 재등장을 한 흐름으로 검증한다.
- 테스트 47/47와 typecheck를 통과했으며 VHK 완료 게이트에서 lint·build를 재검증한다.
