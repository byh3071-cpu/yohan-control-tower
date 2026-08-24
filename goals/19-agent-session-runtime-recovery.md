---
vhk_format: 1
type: goal
id: 19
title: Orca 세션 런타임 복구와 재발 방지
status: DONE
priority: P0
completed: 2026-08-23
---

# Goal 19: Orca 세션 런타임 복구와 재발 방지

## Objective

대형 Codex 세션의 메모리 할당 실패와 존재하지 않는 저장소 경로의 반복 스캔으로 불안정해진 Orca 런타임을 복구하고, 메인 구현과 디자인 작업을 정본 문서에서 새 세션으로 안전하게 이어가며 같은 징후를 사전에 탐지한다.

## Scope

- 장애 세션·Orca 런타임·Git worktree·VHK Goal을 분리해 보존 상태와 실패 원인을 기록한다.
- Orca가 등록 해제할 때 사용하는 상태 정리 범위에 맞춰 존재하지 않는 로컬 저장소 등록을 dry-run 및 명시적 apply 방식으로 정리한다.
- 대형 Codex rollout과 Orca 로그의 누락 cwd `spawn git ENOENT`를 본문 노출 없이 점검하는 읽기 전용 health check를 제공한다.
- 기존 worktree를 보존한 채 메인 구현과 디자인 작업을 각각 새 세션으로 인수인계한다.
- 운영 매뉴얼, 현재 작업흐름 보드, 세션 로그에 복구 결과와 재발 방지 기준을 고정한다.

## Non-Scope

- 기존 203MB 장애 세션 재개 또는 transcript 내용 재작성
- worktree·프로젝트 파일·세션 원본·터미널 daemon 삭제
- 운영 DB 초기화, 인증·시크릿 변경, 전역 설치
- commit·push·PR Ready·merge·배포·publish

## Completion Check

- [x] Orca 등록정보 dry-run에서 누락 로컬 저장소와 정리 대상이 결정론적으로 출력된다.
- [x] 백업 후 누락 저장소 등록을 정리하고 재시작한 Orca의 runtime·graph·terminal API가 정상이다.
- [x] 메인 구현과 디자인 worktree의 새 세션이 정본 인수인계를 읽고 ACK한다.
- [x] health check가 rollout 크기 임계값과 누락 cwd 반복을 transcript 본문 없이 경고한다.
- [x] 운영 매뉴얼과 현재 작업흐름 보드가 복구된 세션·다음 행동·사람 게이트를 가리킨다.
- [x] Goal 전용 검사와 프로젝트 게이트가 통과한다.

## Forbidden

- 존재하는 저장소 또는 worktree 등록 제거
- 예상 개수·대상 digest 불일치 상태에서 전역 메타데이터 수정
- Orca 본체가 실행 중인 상태에서 `orca-data.json` 수정
- terminal daemon과 세션 transcript 삭제
- 장애 세션의 프롬프트·시크릿·credential을 보고서나 검사 출력에 노출
- 사용자 승인 없는 전역 메타데이터 apply 또는 프로세스 종료

## Evidence Plan

- `scripts/recover-orca-stale-repos.mjs`
- `scripts/check-agent-session-health.mjs`
- `docs/operations/agent-session-recovery-runbook.md`
- `docs/operations/current-workstreams.md`
- Orca status·terminal API·새 세션 ACK 영수증
- `scripts/check-goal-19.mjs`
- `docs/log/2026-08-23-agent-session-runtime-recovery.md`

## Evidence

- 공식 Orca setup 제거 후 live dry-run: repo 44, `staleCount: 0`, `residualReferences: []`
- `npm run session:health`: 최근 10분 누락 cwd ENOENT 0, rollout 본문 미열람, 대형 rollout·Windows commit 경고
- 디자인 `DESIGN_HANDOFF_ACK`: `term_5edaee34-4fcf-4cab-a53a-e726a60ada32`, Goal 15 `IN_PROGRESS`
- 메인 `MAIN_HANDOFF_ACK`: `term_c3a2619a-db72-49f8-9119-c4980703cb91`, Goal 14 `DONE`, dirty 37파일 보존
- `node scripts/check-goal-19.mjs`: typecheck·lint·test·build·Goal fixture PASS. build는 Google Fonts fetch가 필요한 기존 계약 때문에 network-capable 권한에서 검증
