---
vhk_format: 1
type: goal
id: 23
title: 작업 형제 보기와 안전한 URL 복원
status: DONE
priority: P0
size: L
execution_provider: orca-ready
automatic_fallback: false
started: 2026-08-25
completed: 2026-08-25
---

# Goal 23: 작업 형제 보기와 안전한 URL 복원

## Objective

기존 Todo·Calendar·Project 기능과 각 원장의 쓰기 경계를 보존하면서 상위 `projects` 슬롯을 `작업`으로 전환하고, `할 일 / 일정 / 프로젝트`를 한 번의 클릭으로 오가는 형제 보기로 제공한다.

## Scope

- `view=work&surface=todo|calendar|projects` query 계약과 날짜·mode·item·mission·project allowlist를 만든다.
- 새 `WorkView`는 형제 navigation과 공통 URL 상태만 소유하고 기존 세 화면을 재사용한다.
- Todo는 Goal·문서와 Calendar task를 합성해 읽되 Calendar만 완료 PATCH를 소유한다.
- Calendar의 same-origin 쓰기, 409 optimistic concurrency, soft delete·restore, 기존 월간·목록 의미를 보존한다.
- Project의 `projects / lint / detail`을 독립적으로 읽어 일부 실패에도 살아 있는 데이터를 표시한다.
- loading·error·empty·partial·selected 상태, selection fail-closed, keyboard·focus return, 반응형 상세를 구현한다.
- 승인된 NOW-R3 밝은 neutral shell과 작업 목록 위계를 적용한다.

## Completion Check

- [x] work navigation의 URL parse·serialize·canonicalize와 back·forward·refresh 계약이 단위 테스트로 증명된다.
- [x] Goal·문서·Calendar task 합성, stable key, partial matrix, Calendar-only completion 경계가 단위 테스트로 증명된다.
- [x] Calendar read task projection과 route 회귀가 통과하고 기존 Calendar 쓰기 계약이 유지된다.
- [x] Project `projects / lint / detail`이 독립 partial model로 동작하고 선택 stale 시 fail-closed 해제된다.
- [x] 상위 탭은 정확히 5개이며 기존 `projects` 한 슬롯만 `작업`으로 바뀌고 Now의 프로젝트 행동이 `work/projects`로 이동한다.
- [x] 세 형제 보기의 loading·error·empty·partial·selected, keyboard·focus, H1 1개와 상태 비색상 전달이 검증된다.
- [x] 360·432·768·1280·1440px에서 요구 레이아웃, 44px 표적, 가로 overflow 0, 이중 scroll 0이 실제 브라우저로 검증된다.
- [x] unit·route tests, typecheck, lint, 전체 test, build, Goal 23 check, VHK verify, git diff check가 모두 통과한다.
- [x] `docs/design/control-tower-vnext/work-screen/design-qa.md`와 세션 로그가 실제 측정·P0/P1 0·잔여 P2를 기록하고 QA가 literal passed로 끝난다.
- [x] Calendar item URL 제거·저장 성공이 dialog 상태와 focus를 동기화한다.
- [x] Calendar range 전환은 pending·cancellation·authoritative response 계약으로 지연 응답 race를 차단한다.
- [x] 1023px 이하 Todo·Project modal이 backdrop pointer 격리와 focus trap·복귀를 보장한다.
- [x] 같은 파일의 동일 문구 Completion Check가 line discriminator로 서로 다른 stable key를 갖는다.
- [x] 한글·공백 상대경로 item은 round-trip하고 절대·drive·traversal·source-surface mismatch는 거절한다.
- [x] raw browser QA가 history 전후·Back close·cross-month delay·768 backdrop·key·실수 bounding rect 증거를 남긴다.

## Forbidden

- Goal Completion Check와 Calendar 완료의 자동 동기화
- Calendar 밖의 owner에서 Calendar task 완료 쓰기
- Project API에 쓰기 method 추가
- 상위 탭 6개, 다른 네 탭의 이름·책임 변경, NOW 54px H1 복제
- 절대경로·secret을 URL 또는 브라우저 payload에 포함
- 기존 월간·목록 Calendar 의미 변경, NOW-R3 재구현
- commit·push·PR·PR Ready·master/main merge·deploy·publish

## Evidence Plan

- `src/lib/work-navigation.test.ts`
- `src/lib/work-items.test.ts`
- `src/lib/calendar-route.test.ts`
- `src/lib/project-work-model.test.ts`
- `docs/design/control-tower-vnext/work-screen/design-qa.md`
- `docs/log/2026-08-25-work-sibling-views.md`
- `scripts/check-goal-23.mjs`
