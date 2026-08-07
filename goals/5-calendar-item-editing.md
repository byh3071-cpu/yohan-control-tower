---
vhk_format: 1
type: goal
id: 5
title: Calendar 원본 항목 안전 수정
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 5: Calendar 원본 항목 안전 수정

## Objective

잘못 만들거나 계획이 바뀐 일정·할 일을 UI에서 다시 열어 수정하고, 로컬 Markdown 원본과 반복 발생 목록이 데이터 손실 없이 함께 갱신되어야 한다.

## Scope

- 선택 날짜 패널과 목록에서 일정·할 일을 수정할 수 있다.
- 반복 항목 수정은 선택한 1회가 아니라 원본 반복 전체에 적용됨을 UI에서 명시한다.
- 항목 종류(`event | task`)와 ID·생성 시각은 수정할 수 없다.
- 제목·원본 시작일·시간·반복 규칙·메모를 기존 생성 계약과 같은 검증으로 갱신한다.
- 반복 규칙 변경 시 새 규칙에 유효한 완료 발생일만 보존한다.
- UI가 읽은 뒤 Markdown 파일이 외부에서 바뀌었다면 `updated_at` 충돌로 쓰기를 거부한다.

## Completion Check

- [x] 일정·할 일 카드에서 수정 화면을 열 수 있다.
- [x] 수정 화면이 원본 시작일·시간·반복·메모를 정확히 채운다.
- [x] 반복 항목에는 `반복 전체 수정`임이 명시된다.
- [x] PATCH `update_item`이 ID·kind·created_at을 보존하고 `updated_at`을 갱신한다.
- [x] 잘못된 입력과 오래된 `expectedUpdatedAt`은 원본을 덮어쓰지 않고 명시적으로 실패한다.
- [x] 반복 규칙 변경 후 유효하지 않은 `completed_dates`가 제거된다.
- [x] 비반복·반복 수정과 충돌 처리가 테스트로 고정된다.
- [x] typecheck, test, lint, build가 통과한다.
- [x] Playwright에서 수정→월간·목록 반영과 콘솔 오류 0을 확인한다.

## Forbidden

- 선택한 반복 발생 1회만 수정한 것처럼 표시
- 항목 종류·ID·created_at 변경
- 외부 변경을 silent overwrite
- Brain·Notion Calendar 수정
- 삭제·휴지통·PWA·알림을 Goal 5에 섞기
- main 직접 push 또는 자동 merge

## Evidence

- `updateCalendarItem`은 ID·kind·created_at을 보존하고, UI가 읽은 `expectedUpdatedAt`과 파일의 최신 값을 비교해 외부 변경을 409 Conflict로 거부한다.
- 반복 규칙 변경 시 새 발생 규칙에 맞지 않는 `completed_dates`만 제거하며 비반복·반복·충돌 회귀 테스트 3개를 추가했다.
- Calendar 카드의 연필 버튼이 원본 값으로 수정 화면을 열고 반복 항목에는 `반복 전체 수정` 범위를 표시한다.
- 테스트 43/43, typecheck, lint, production build를 통과했다.
- production Playwright에서 `Goal 5 수정 전` 0건, `Goal 5 수정 완료` 3건, 월간·목록 반영, 수평 overflow 0, 콘솔 오류 0을 확인했다.
