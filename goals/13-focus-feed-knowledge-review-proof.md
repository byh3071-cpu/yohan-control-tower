---
vhk_format: 1
type: goal
id: 13
title: Focus Feed 지식 검토 근거와 정확히 1회 승인 증명
status: DONE
priority: P0
completed: 2026-08-23
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
- 실제 운영 검토 job: `218827c7-5d0d-40c1-bfc0-56cb858d1e1d` — 2026-08-21 Control Tower UI 승인으로 `review_required` → `completed` 전이.
- Brain RESOURCE: `memory/ingest/url/knowledge-218827c7-5d0d-40c1-bfc0-56cb858d1e1d.md` 1개, SHA-256 `9ab28e368e998816e9c1572f3ec27bfee5c49fd964d98a82647d37d16dd8db6e`.
- Brain SUMMARY: `memory/ingest/insights/knowledge-218827c7-5d0d-40c1-bfc0-56cb858d1e1d.md` 1개, SHA-256 `8dc9001ce7f040a2427fbabd575d2b1664cdbb43ee769a4b6eabd5391d12bf4a`.
- 재승인 응답은 `idempotent: true`였고 위 두 hash가 전후 동일했다. 원본 실행 기록: yohan-brain `docs/handoffs/2026-08-20-codex-rescue/_runs/L3-2026-08-21-canary-run.md`.
- 2026-08-23 `vhk verify`: typecheck·lint·test·build·secure 5/5 PASS. 첫 build의 Google Fonts 네트워크 차단은 네트워크 허용 재실행에서 통과했다.
- 2026-08-23 `goal check --id 13 --force`: typecheck·lint·test·build PASS. 샌드박스 첫 실행의 Google Fonts 차단은 네트워크 허용 동일 명령에서 해소됐다.
- 2026-08-23 `vhk check`: 기존 기준선 21건으로 FAIL. `YOHAN_OS_ROOT`·`AbortSignal.any`·Qdrant `match.any`·`*.test.ts`는 규칙 파서 오탐이고, PascalCase 벡터 컴포넌트 5개는 Goal 13 밖의 기존 파일명 위반이다.
- Goal 15가 VHK 일반 검사와 프로젝트 전용 AST 검사를 합성하고 실제 파일명 위반을 정리했다. `vhk check`·`vhk verify`·`goal check --id 15 --force`·`goal done --id 15`가 모두 통과했다.
- `docs/state/blockers.md`의 VHK 정책 기준선 blocker를 해결 처리하고 이 Goal을 `IN_PROGRESS`로 재활성화했다.
