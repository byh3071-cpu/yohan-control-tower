---
vhk_format: 1
type: goal
id: 10
title: Calendar 일상 사용 슬라이스 문서화와 출고 검증
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 10: Calendar 일상 사용 슬라이스 문서화와 출고 검증

## Objective

Calendar 생성 이후 실제 일상 사용에 필요한 수정·안전 삭제·복구·모바일 우선 화면의 구현 상태와 경계를 문서 SoT에 맞추고, 기존 Draft PR에 올릴 수 있는 검증된 변경 묶음으로 만든다.

## Scope

- PRD F011의 현재 구현 상태와 사용자 여정을 갱신한다.
- Architecture의 Calendar 저장·API·충돌·휴지통 경계를 갱신한다.
- ADR-002를 append-only 휴지통과 복구 결정까지 확장한다.
- 생태계 계약 감사와 세션 로그에 현재 충족·비범위·다음 선택을 기록한다.
- VHK Goal 5~10 및 Playwright 증거를 최종 교차 확인한다.
- 전체 품질·문서·규칙 동기화 게이트를 통과한다.

## Completion Check

- [x] PRD에 수정·휴지통·복구·모바일 선택일 우선 동작이 반영된다.
- [x] Architecture에 `items/`·`trash/`, PATCH·DELETE, 충돌·복구 경계가 반영된다.
- [x] ADR-002가 영구 삭제 없는 rename 기반 휴지통 결정을 설명한다.
- [x] 생태계 감사의 Calendar·VHK 판정과 권장 다음 순서가 현재 상태다.
- [x] 세션 로그에 Phase·Goal 결과, 테스트, 시각 QA, VHK 이슈가 기록된다.
- [x] Goal 5~9가 DONE이고 Goal 10만 active다.
- [x] `verify:docs`, `vhk sync --check`, typecheck, test, lint, build가 통과한다.
- [x] Git diff에 비밀 값·개인 절대경로·QA 임시 산출물이 없다.

## Forbidden

- PWA 알림·외부 Calendar 동기화를 완료로 문서화
- 영구 삭제·`unlink`를 Calendar 계약에 추가
- QA 스크린샷·임시 core-ruleset을 소스 커밋에 포함
- 실제 검증과 다른 숫자 기록
- main 직접 push 또는 자동 merge

## Evidence

- `docs/PRD.md`: F011을 생성·반복·발생일 완료에서 안전 수정·휴지통·복구·모바일 선택일 우선까지 현재 구현 상태로 갱신했다.
- `docs/ARCHITECTURE.md`: `items/`·`trash/`, GET·POST·PATCH·DELETE, `expectedUpdatedAt` 409, byte-exact rename·복구 충돌 불변식을 기록했다.
- `docs/adr/ADR-002-local-calendar-markdown-store.md`: 영구 삭제·`unlink` 없이 확인 후 rename하고 원문을 복구하는 결정으로 확장했다.
- `docs/ECOSYSTEM-CONTRACT-AUDIT.md`: Calendar 판정, Goal 5~10 VHK 적용, Playwright 범위, 다음 PWA/Skill Registry 선택을 현재화했다.
- `docs/log/2026-08-07-calendar-daily-use-mvp.md`: Phase A~D, Goal 5~10, 47/47 테스트, Playwright 계측, VHK #555·#556·#557과 남은 경계를 기록했다.
- `npm run vhk -- goal list`: Goal 5~9 `DONE`, Goal 10만 `IN_PROGRESS`임을 확인했다.
- `verify:docs`: 격리 환경에서 임시 Brain `memory/` 외부 의존을 지정해 allowlist·archive·traversal 계약이 통과했다.
- configured core 원본을 지정한 `vhk sync --check`가 드리프트 0으로 통과했고, `.agents/CORE-RULES.md`는 기존 v0.1.5 Git blob과 일치한다.
- `git diff --check`, `npm ls @byh3071/vhk --depth=0`이 통과했고 QA 스크린샷·스크립트는 저장소 밖 전용 디렉터리에만 있다.
- VHK가 만든 개인 `memory.json.bak`은 제거하고 `.vhk/.gitignore`에 `*.bak`을 추가했다. 추적 이벤트·ledger·receipt-log에는 토큰이나 개인 경로가 없다.
- `scripts/check-goal-10.mjs`가 typecheck·lint·secure scan·verify:docs·test·build와 문서 계약을 재검증한다.
