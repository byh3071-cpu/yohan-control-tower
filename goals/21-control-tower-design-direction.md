---
vhk_format: 1
type: goal
id: 21
title: 요한 관제탑 디자인 방향 선택과 기술 명세
status: DONE
priority: P0
completed: 2026-08-24
---

# Goal 21: 요한 관제탑 디자인 방향 선택과 기술 명세

## Objective

요한 생태계의 실제 정본·작업 흐름·승인 경계를 다시 조사하고, 불필요한 화면을 덜어낸 관제탑 정보 구조와 비교 가능한 시각 방향 세 개를 만든다. 사용자가 한 방향을 선택한 뒤에만 구현 명세로 전환한다.

## Scope

- Brain·관제탑 코드·기존 승인 시안·공식 제품 패턴 조사
- 프로젝트 소유 DesignContext와 결정 로그
- 홈·프로젝트·문서/검토·기록·진단의 정보 구조 감축
- 동일 과업·viewport·data state를 사용하는 시각 방향 정확히 세 개
- 선택된 방향의 토큰·컴포넌트·상태·반응형·접근성·기술 인수인계

## Completion Check

- [x] 제품 목적, 사용자, SoT, 쓰기 경계, 탭 상한, 기존 자산과 현재 구현의 충돌을 기록한다.
- [x] 외부 공식 레퍼런스가 각각 어떤 설계 질문에 답하는지 기록한다.
- [x] 실제 시각 시안 세 개를 같은 조건으로 생성하고 비교한다.
- [x] 사용자가 한 방향을 선택하거나 조합·재생성을 명시한다.
- [x] 선택된 방향의 디자인·기술 명세와 검증 계획을 완성한다.

## Forbidden

- 디자인 선택 전 `src/` production UI 수정
- 기존 Brain 파일 수정 또는 Notion을 정본으로 취급
- 탭 6개 이상, 출처 없는 숫자, 승인 없는 AI 상태 변경
- 과거 승인 이미지를 현재 목적 확인 없이 그대로 복제
- main/master 직접 push, PR Ready, merge, deploy, publish

## Evidence

- `docs/design/control-tower-vnext/design-context.md`
- `docs/design/control-tower-vnext/research.md`
- `docs/design/control-tower-vnext/decision-log.md`
- `docs/design/control-tower-vnext/work-item-language-contract.md`
- `docs/design/control-tower-vnext/design-spec.md`
- `docs/prototypes/control-tower-now-mova-r3/index.html`
- `docs/prototypes/control-tower-now-mova-r3/now-mova-r3-1440.png`

## 계보 메모

이 Goal은 `codex/control-tower-design-direction` 격리 worktree에서만 진행한다. Goal 13은 기존 구현 계보이므로 상태나 파일을 변경하지 않는다.
