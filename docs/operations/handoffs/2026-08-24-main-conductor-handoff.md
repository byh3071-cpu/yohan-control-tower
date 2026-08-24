# 새 메인 지휘자 인수인계

- Bundle ID: `main-conductor-handoff-2026-08-24-01`
- Prepared: 2026-08-24 13:28 KST
- Owner scope: yohan-control-tower main · 디자인팀 · Yohan Agent Kit 세션 운영
- Active conductor: 현재 Codex 세션
- Ownership epoch: 1
- Content receipt: prepared, project-owned paths verified
- Delivery receipt: not-sent
- Receiver acknowledgement: pending

## 한 줄 임무

이미 끝난 복구·NOW-R3·공용 스킬 소스 구현을 다시 하지 말고, Agent Kit 통합 게이트와 디자인 후속 Goal·보존 worktree를 한 원장으로 관리하며 사용자에게 다음 사람 게이트 하나만 제시한다.

## 먼저 읽을 순서

1. `AGENTS.md`, `RULES.md`, `.vhk/HARD_STOP`
2. `goals/20-main-conductor-session-handoff.md`
3. `docs/operations/main-conductor-session-protocol.md`
4. `docs/operations/current-workstreams.md`
5. `docs/operations/agent-session-recovery-runbook.md`
6. 이 handoff

채팅 요약보다 Git/VHK/Orca 실측을 우선한다. Public/dev의 `.agents/system_context.md`와 `TASK_BOARD.md`는 2026-08-01·08-07 스냅샷이므로 최신 사실로 간주하지 말고 backlog 후보로만 읽는다.

## 현재 증거 원장

| 흐름 | 상태 | 정본·ref | dirty / delivery | 정확한 다음 행동 |
| --- | --- | --- | --- | --- |
| 관제탑 main 복구 | 구현·검증·로컬 commit 완료 | `master` `1b5b4fb` | `vhk context` 재생성분과 Goal 20 handoff 작업이 후속 checkpoint 대상 | Goal 20 bundle을 검증하고 새 세션 ACK를 기록 |
| 디자인 NOW-R3 | 구현·QA·로컬 commit 완료 | `codex/control-tower-design-direction` `c176c3b` | clean, handoff prepared·not-sent | 새 독립 디자인 세션에 전달; 다음은 `작업`의 할 일·일정·프로젝트 형제 보기 Goal 범위 승인 |
| Agent Kit 세션 스킬 | source 구현·최신 local main 정렬·회귀 완료 | `feat/design-team-session-continuity` `a5aa50d`; 소스 구현 기준 `88d7716` | clean. 사용자 홈 3표준 경로는 source Check 당시 세 스킬 모두 `Installable`; 설치·벤더 새 세션 검증은 미실행 | feature branch push·Draft PR 준비 후 사람 merge 게이트. merge 뒤 canonical source에서 Check 재실행 |
| Agent Kit canonical main | 보존 | `main` `3a8b067`, origin보다 12 commit 앞 | 사용자 변경 `goals/5`, `goals/10` dirty | 직접 수정·병합 금지; 격리 worktree에서만 통합 |
| `tower-workbench` | Goal 14 구현·검증 보고는 있으나 사람 검토 대기 | `byh3071-cpu/tower-workbench-20260822` `cfee44a` | 다수 dirty·untracked, commit 없음 | diff·캡처 검토 전 정리·commit·merge 금지 |
| `permit` | crash 원본·복구 증거로 격리 | `byh3071-cpu/explain-screenshot-image` `cf61612` | dirty·untracked, 대형 원본 resume 금지 | 읽기 전용 증거 회수 외 수정·재개 금지 |

## 완료된 것과 아직 아닌 것

### 완료

- Orca stale repo 등록 13개 제거, 최근 누락 cwd ENOENT 0, 대형 세션 재개 금지 런북.
- 관제탑 Goal 13·15~19 완료, VHK 2.14.0, 전체 verify 5/5, main commit `1b5b4fb`.
- 디자인 NOW-R3 선택·production 첫 슬라이스·360/432/768/1280/1440 및 상태 5종 QA, commit `c176c3b`.
- Agent Kit `restart-safe-handoff`, `supervised-session-conductor`, `runtime-incident-investigator` 소스·manifest·registry·적대 fixture와 Goal 15 gate.
- Agent Kit 최신 local main 병합, retrieval script 6개 registry 누락 보정, catalog 216자산·멀티벤더 233 assertions PASS, clean checkpoint `a5aa50d`.

### 미완료

- 세 공용 스킬의 canonical main 통합, 사용자 홈 설치, Claude Code·Cursor·Codex·Antigravity 새 세션 발견 검증.
- 디자인 handoff의 `sent`·`acknowledged` 영수증.
- Agent Kit branch의 Draft PR·사람 merge.
- `tower-workbench`의 사람 검토·commit 판단.
- 관제탑 Goal ID `2` 중복과, 디자인 branch Goal 15·16이 main Goal 15·16과 충돌하는 번호 재정렬.
- 오래된 Public/dev `system_context.md`·`TASK_BOARD.md`의 별도 운영 감사.
- 현재 Brain 계약과 yohan-mcp checkout의 retrieval implementation ref·runtime path가 맞지 않아 Goal 16 cross-repo handshake가 FAIL한다. 세션 운영 스킬 회귀와 분리해 retrieval 계약 drift로 조사해야 한다.

## 실행 순서

1. 현재 Goal 20 handoff content를 ACK하고 단일 writer를 인수한다.
2. 새 디자인 세션의 전달·ACK를 확인하되 production 후속 구현은 새 Goal 범위 승인 전 시작하지 않는다.
3. Agent Kit `a5aa50d`의 Goal 15·catalog·멀티벤더 PASS를 재확인한다. Goal 16 cross-repo 실패는 Brain↔MCP ref drift가 해소되기 전 세션 스킬 실패로 합치지 않는다.
4. feature branch push·Draft PR을 준비하고 merge는 사람 게이트에서 멈춘다.
5. merge 뒤 canonical checkout에서 세 스킬을 다시 `Check`한다. `Installable`이면 정확한 PlanDigest와 대상 경로를 보여주고 사용자 홈 쓰기 승인을 받는다.
6. 승인 Install 뒤 각 벤더의 새 세션에서 명시·자동·부정 호출을 검증한다. Antigravity CLI fallback은 표준 발견 실패의 최신 음성 증거가 있을 때만 별도 게이트로 연다.
7. 디자인 Goal 번호와 main Goal 번호 충돌을 merge 전에 재부여한다. 기존 기록 링크를 함께 고치고 VHK 중복 ID 경고 0을 확인한다.
8. `tower-workbench`와 후속 `작업` 화면은 위 운영 정산과 섞지 않고 각각 한 사람 게이트로 연다.

## Backlog

| 우선순위 | 항목 | 상태·게이트 |
| --- | --- | --- |
| P0 | 새 메인·디자인 세션 delivery ACK | 현재 Goal 20, ACK 전 완료 금지 |
| P0 | Agent Kit `a5aa50d` Draft PR | branch clean·통합 회귀 PASS, merge는 사람 |
| P0 | Brain↔MCP retrieval contract drift 조사 | Goal 16 cross-repo handshake 차단, 세션 스킬과 별도 workstream |
| P0 | 공용 스킬 사용자 홈 설치와 새 벤더 세션 smoke | 최신 Check PlanDigest + 별도 홈 쓰기 승인 |
| P0 | 디자인·main Goal 번호 충돌 제거 | merge 전 필수, 역사 링크 보존 |
| P1 | `tower-workbench` Goal 14 사람 검토 | dirty 보존, 사용자 시각·범위 판단 |
| P1 | 디자인 후속 `작업` 화면 Goal 제안 | `할 일/일정/프로젝트`만, 다른 화면 혼입 금지 |
| P2 | Public/dev 중앙 보드 최신화 | 다른 활성 세션 예약을 다시 실측한 별도 운영 감사 |

## 하드게이트

- 지금 허용된 것은 로컬 정산·검증·handoff다.
- main/master merge, PR Ready, 전역 사용자 홈 Install, 배포·publish, 삭제·대규모 이동, 인증·시크릿 변경은 별도 사람 게이트다.
- `permit`, `tower-workbench`, Agent Kit canonical main의 기존 dirty 변경을 덮어쓰지 않는다.

## 새 지휘자의 첫 응답 계약

다음 일곱 항목을 한국어로 짧게 되말한다.

1. 실제 cwd
2. branch와 HEAD
3. dirty 상태
4. HARD_STOP 상태
5. active Goal과 현재 Completion Check
6. 세 흐름의 현재 상태: main / design / Agent Kit
7. 바로 할 한 가지와 다음 사람 게이트

하나라도 현재 실측과 다르면 구현하지 말고 contradiction으로 보고한다.

## 새 메인 세션 전달 프롬프트

```text
요한 관제탑의 새 메인 지휘자로 소유권을 이어받아라. 채팅 기억을 정본으로 쓰지 말고 AGENTS.md와 Goal 20, docs/operations/handoffs/2026-08-24-main-conductor-handoff.md를 먼저 읽어라.

파일을 수정하기 전에 실제 cwd·branch·HEAD·dirty·HARD_STOP·active Goal을 확인하고, handoff의 `새 지휘자의 첫 응답 계약` 7개를 한국어로 짧게 ACK하라. 기존 NOW-R3, Goal 13·15~19, 공용 스킬 소스 구현을 다시 하지 마라.

단일 writer를 인수한 뒤 첫 작업은 Agent Kit 통합 회귀와 디자인 세션 delivery ACK의 현재 증거를 화해하는 것이다. 사용자 홈 설치, main/master merge, PR Ready, 배포, 삭제, 인증·시크릿 변경은 별도 사람 게이트 전 실행하지 마라. `permit`·`tower-workbench`·Agent Kit canonical main의 dirty 변경을 보존하라.
```

## 전달 영수증

| 단계 | 상태 | 근거 |
| --- | --- | --- |
| content prepared | 완료 | Goal 20, protocol, current-workstreams, 이 handoff |
| design sent | 대기 | 새 디자인 terminal 생성·prompt 전송 필요 |
| design acknowledged | 대기 | branch/ref·승인 상태·다음 행동 ACK 필요 |
| main sent | 대기 | 새 main Codex terminal 생성·prompt 전송 필요 |
| main acknowledged | 대기 | 첫 응답 계약 7개 ACK 필요 |
| prior conductor closed | 대기 | main prompt 전송 후 현재 세션 종료 |
