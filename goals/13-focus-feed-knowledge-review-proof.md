---
vhk_format: 1
type: goal
id: 13
title: Focus Feed 지식 검토 근거와 정확히 1회 승인 증명
status: DONE
priority: P0
completed: 2026-08-22
---

# Goal 13: Focus Feed 지식 검토 근거와 정확히 1회 승인 증명

## Objective

Control Tower에서 Focus Feed 검토자가 사실·해석·제안을 구분해 판단하고, 사람 승인 뒤 Yohan Brain RESOURCE·SUMMARY가 정확히 한 번만 생성되는 것을 실제 데이터로 증명한다.

## Scope

- yohan-mcp 검토 응답을 브라우저 허용목록으로 정규화한다.
- 사실 주장에는 검증된 타임스탬프와 짧은 근거 문구를 표시한다.
- 해석·제안은 사람 판단 및 교차 검증 필요 여부를 구분한다.
- 승인 응답에서 Brain 내부 경로와 비공개 필드를 노출하지 않는다.
- 실제 Control Tower UI 승인 전후 Brain 파일 수와 hash 불변성을 검증한다.

## Completion Check

- [x] 검토 UI가 핵심 요점과 사실·해석·제안을 분리해 표시한다.
- [x] 문자열 alias 충돌·타입 위조·과도한 collection을 fail-closed로 차단한다.
- [x] 390px 모바일과 데스크톱에서 검토 근거와 44px 주요 동작을 확인한다.
- [x] 사용자가 Control Tower UI에서 실제 항목 1건을 승인한다.
- [x] 승인 후 Brain RESOURCE·SUMMARY가 각각 1개이며 재승인에도 hash가 변하지 않는다.
- [x] typecheck·lint·test·build·VHK policy·비밀값 검사가 통과한다.

## Forbidden

- 사용자 승인 없이 Brain 정본 승격
- 원문 전체·hash·절대 경로·시크릿을 브라우저에 노출
- 승인 계약을 우회하는 직접 파일 쓰기나 DB status PATCH
- main 직접 push 또는 자동 merge

## Evidence

- `src/lib/knowledge-review-controller.ts`: 브라우저 허용목록, alias 일치, collection 상한, POST 응답 축소.
- `src/components/knowledge-review-panel.tsx`: 핵심 요점, 주장 유형, 검증된 타임스탬프·근거, 사람 판단 표시.
- `src/lib/knowledge-review-controller.test.ts`: 위조·충돌·상한·응답 노출 회귀 검사.
- 실제 운영 검토 job: `2ce64944-0a81-4274-82bf-f7542e43d9ad` (사용자가 UI에서 승인, RESOURCE·SUMMARY 각 1개 생성).
- 승인·멱등성 증거: `docs/log/2026-08-22-goal-13-approval-proof.md`.
- 시각·적대검수 증거: `design-qa.md`, `docs/design/knowledge-review/captures/`.
