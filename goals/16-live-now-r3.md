---
vhk_format: 1
type: goal
id: 16
title: 실데이터 기반 NOW-R3 지금 화면 구현
status: DONE
priority: P0
completed: 2026-08-24
---

# Goal 16: 실데이터 기반 NOW-R3 지금 화면 구현

## Objective

승인된 NOW-R3의 작업 언어와 시각 위계를 현재 Home 진입 화면에 적용한다. 로컬 `goals/*.md`의 실제 Goal·Task를 읽되 활성 Goal이 여러 개면 하나를 임의로 선택하지 않고 사람의 우선순위 확인을 요청한다.

## Scope

- `/api/todos` 응답에서 활성 Goal과 다음 Task를 고르는 순수 선택 계약
- 활성 Goal 0개·1개·복수 상태의 명시적 UI
- 기존 상단 내비게이션과 다른 화면을 유지한 Home의 NOW-R3 전환
- 실제 Goal 이름·Task 문장·완료 진행률·기준 시각 표시
- loading·error·empty·selection-required 상태
- 선택 계약 단위 테스트와 반응형·키보드·콘솔 시각 QA
- 구현 근거와 결과를 기록하는 `design-qa.md`

## Completion Check

- [x] 순수 선택 계약이 활성 Goal 0개·1개·복수를 구분하고 비활성 Goal·문서 Todo를 현재 Task로 승격하지 않는다.
- [x] 활성 Goal이 하나면 실제 Goal 이름·현재 Task·Task 순서·완료 진행률을 표시한다.
- [x] 활성 Goal이 여러 개면 `우선 작업 확인 필요`를 표시하고 하나를 임의 선택하지 않는다.
- [x] R3의 한 화면 한 주인공, H1 하나, 주요 행동 하나, 14px 미만 설명 0 조건을 만족한다.
- [x] 기존 상단 내비게이션과 다른 네 화면은 유지하고 아직 없는 vNext 화면을 빈 탭으로 노출하지 않는다.
- [x] loading·error·empty 상태가 원인과 다음 행동을 텍스트로 설명한다.
- [x] 360·432·768·1280·1440px에서 가로 overflow 0, 핵심 행동 가림 0, 콘솔 오류 0, 키보드 도달을 확인한다.
- [x] `typecheck`, `lint`, `test`, `build`가 통과한다.
- [x] `docs/design/control-tower-vnext/design-qa.md`가 `final result: passed`로 끝난다.

## Forbidden

- Goal이 여러 개인데 AI·priority·파일 번호로 하나를 임의 선택
- 기존 상단 탭의 이름·수·책임 변경
- Phase·Issue·담당자·기한의 가짜 값 생성
- Brain 기존 파일 수정, Notion 쓰기, 운영 상태 변경
- main/master 직접 push, PR Ready, merge, deploy, publish

## Evidence

- `docs/prototypes/control-tower-now-mova-r3/index.html`
- `docs/prototypes/control-tower-now-mova-r3/now-mova-r3-1440.png`
- `docs/design/control-tower-vnext/work-item-language-contract.md`
- `docs/design/control-tower-vnext/design-spec.md`
- `docs/design/control-tower-vnext/design-qa.md`

## 계보 메모

이 Goal은 `codex/control-tower-design-direction` 격리 worktree에서만 진행한다. Goal 13은 별도 세션의 사람 승인 증명 계보이므로 상태·Completion Check·산출물을 변경하지 않는다. 저장소 전체에는 Goal 13과 이 Goal이 동시에 보일 수 있으므로 NOW 선택 계약은 이 실제 충돌을 숨기지 않는다.
