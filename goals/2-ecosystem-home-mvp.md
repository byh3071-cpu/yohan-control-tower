---
vhk_format: 1
type: goal
id: 2
title: 생태계 Home MVP
status: DONE
priority: P0
completed: 2026-08-07
---

# Goal 2: 생태계 Home MVP

## Objective

요한 관제탑에 다섯 번째이자 마지막 상단 탭인 `Home`을 추가한다. 사용자는 한 화면에서 지금 할 일과 Work, Knowledge, Build & Skills, Finance 영역의 연결 상태를 파악하고 기존 화면으로 이동할 수 있어야 한다.

## Scope

- 기존 데이터만 사용해 오늘의 다음 행동을 표시한다.
- 문서, 인박스, 스킬 자산, 기록 상태를 실제 집계값으로 표시한다.
- 아직 데이터 원장이 없는 캘린더와 재무는 수치를 만들지 않고 `연결 전`으로 표시한다.
- 기존 Projects, Docs, Records, Vector 탭의 계약은 유지한다.
- 모바일과 데스크톱에서 사용할 수 있는 반응형 레이아웃을 제공한다.

## Completion Check

- [x] 상단 내비게이션이 Home을 포함해 정확히 5개 탭이다.
- [x] 첫 진입 화면이 Home이다.
- [x] `/api/todos`의 실제 할 일을 최대 3개 표시하고 오류/빈 상태를 설명한다.
- [x] Knowledge, VHK·MCP·Skills, Finance 상태가 한 화면에 보인다.
- [x] 카드와 빠른 동작이 기존 탭 또는 인박스로 연결된다.
- [x] 캘린더와 재무에 가짜 수치를 사용하지 않는다.
- [x] Brain `projects.yaml`과 로컬 `goals/*.md`를 조인한 F004 미션 롤업을 표시한다.
- [x] typecheck, 29 tests, lint, build가 통과한다.
- [x] 실제 브라우저에서 데스크톱·모바일 시각 검증을 완료한다.
- [x] v1.1 선행 게이트인 생태계 계약 개정과 `projects.yaml` 존재를 확인한다.

## Evidence

- Brain `ecosystem-contract.yaml` active v0.3.0, `inheritance-registry.yaml` contract v0.3.0, `projects.yaml` active v0.1.1을 GitHub Connector로 확인했다.
- 로컬 Playwright로 1440×900·390×844를 검증했다. 가로 overflow 0, 탭 5개, 미션 카드 5개, 카드→프로젝트 이동, 콘솔 오류 0을 확인했다.
- F004·캐시 테스트 8개를 추가했다. 세부 내용은 `docs/log/2026-08-07-mission-rollup-f004.md`에 기록한다.
- VHK 2.12.0 `goal done --id 2`가 typecheck·lint·test·build와 Goal 고유 검증 7개를 재실행한 뒤 DONE으로 전이했다.
- DONE 이후 캐시 경쟁 테스트와 test glob을 보강한 뒤 `goal check --id 2 --force`를 다시 통과했다.
