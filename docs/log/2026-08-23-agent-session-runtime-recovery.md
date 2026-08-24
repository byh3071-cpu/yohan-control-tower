# 2026-08-23 — Orca 세션 런타임 복구와 재발 방지

## 결과

- `permit`의 약 203.75MB Codex thread는 재개하지 않고 rollout·thread DB·terminal history를 `%APPDATA%\orca\recovery-backups\2026-08-23-permit-01a028d3`에 보존했다.
- Orca가 반복 탐색하던 존재하지 않는 repo/worktree 등록 13개를 공식 `project setup-delete` 경로로 제거했다.
- 제거 후 `scripts/recover-orca-stale-repos.mjs`는 repo 44, `staleCount: 0`, 잔여 참조 0을 반환했다.
- 새 디자인팀 Codex는 실제 디자인 worktree와 Goal 15를 확인해 `DESIGN_HANDOFF_ACK`를 반환했다.
- 새 메인 Codex는 실제 main worktree, HEAD, dirty 37파일, Goal 14 DONE, 기존 검증 증거와 사람 게이트를 확인해 `MAIN_HANDOFF_ACK`를 반환했다.
- rollout 크기, 최근 누락 cwd `spawn git ENOENT`, Windows committed memory를 읽기 전용으로 점검하는 `npm run session:health`를 추가했다.
- 운영 절차는 `docs/operations/agent-session-recovery-runbook.md`, 현재 세션 상태는 `docs/operations/current-workstreams.md`에 고정했다.

## 원인 판정

| 현상 | 판정 | 확신 |
| --- | --- | --- |
| `permit` Codex child 종료 | 대형 rollout 적재 중 512MB 메모리 할당 실패 | 높음 |
| `spawn git ENOENT` 반복 | Orca에 남은 존재하지 않는 cwd 등록 13개 | 높음 |
| sandbox의 `runtime_unavailable` | Orca 전체 다운이 아니라 Windows named-pipe 실행 신원 차이 | 높음 |
| 외부 디자인 worktree terminal timeout | `externalWorktreeVisibility: hide` 상태의 UI/handle 채택 경로 결함 | 중간 |
| 최초 Orca 앱 재시작 원인 | `not established` — crash stack 없음 | 해당 없음 |

서로 다른 계층의 증상을 하나의 원인으로 합치지 않았다. Git 자체는 같은 시각 다른 cwd에서 성공했고, 사용자 신원의 Orca RPC도 같은 runtime ID에서 성공했다.

## 복구 계보

### 디자인

- crash source: `permit`, branch `byh3071-cpu/explain-screenshot-image`
- durable SoT: 디자인 worktree의 `docs/design/control-tower-vnext/session-handoff.md`
- recovered session: `term_5edaee34-4fcf-4cab-a53a-e726a60ada32`
- verified state: branch `codex/control-tower-design-direction`, HEAD `46da6ea`, clean, Goal 15 `IN_PROGRESS`, Candidate A
- next gate: `지금` 화면의 one-sentence job과 요소 우선순위 확인 뒤 1440px 구조 3안

외부 worktree를 직접 지정한 terminal create는 handle timeout이 났다. 등록된 repo root terminal을 만들고 시작 명령에서 디자인 worktree로 이동한 뒤 Codex를 실행했다. Orca metadata가 아니라 Codex 화면의 실제 cwd·Git branch·clean 상태로 성공을 검증했다.

### 메인

- durable worktree: `tower-workbench-20260822`
- recovered session: `term_c3a2619a-db72-49f8-9119-c4980703cb91`
- verified state: branch `byh3071-cpu/tower-workbench-20260822`, HEAD `cfee44a`, dirty 37파일, Goal 14 `DONE`
- preserved evidence: typecheck·lint·test 81/81·build·VHK·Playwright PASS, 캡처 5개, QA P0/P1/P2 0
- next gate: 미커밋 diff와 캡처 사람 검토 후 commit 여부 결정

인계 검토 중 새 세션이 `vhk context`를 실행해 관리 스냅샷 `.vhk/context.md`를 재생성했다고 보고했다. 해당 변경은 사용자 자산으로 보존했고 되돌리지 않았다.

## 재발 방지 계약

- 64MB 이상 rollout은 새 thread 준비 경고, 128MB 이상은 기존 thread resume 금지 기준이다.
- Windows committed memory 85% 이상은 fanout 축소, 95% 이상은 신규 provider 기동 중단 기준이다.
- 최근 10분 누락 cwd ENOENT가 한 건이라도 있으면 repo 등록을 대조하고 10건 이상이면 신규 세션 생성을 중단한다.
- `status`와 harmless read RPC를 같은 실행 신원에서 함께 확인한다.
- 새 worker 전에 기존 worktree·terminal·Run·Task·Dispatch·보고서를 먼저 감사한다.
- 내용 영수증과 전달 영수증을 분리하고, 보고서가 남아 있으면 작업을 재실행하지 않고 전달만 복구한다.
- 범용 운영 계약은 Yohan Agent Kit의 `supervised-session-conductor`, `restart-safe-handoff`, `runtime-incident-investigator` 후보로 승격하고 Orca 명령 자체는 live `orchestration`·`orca-cli`가 소유한다.

## 검증

- `node scripts/recover-orca-stale-repos.mjs` — live `staleCount: 0`
- `npm run session:health` — 최근 10분 누락 cwd 0, 대형 rollout 4개 critical, Windows commit warning
- `node scripts/check-agent-session-health.mjs --orca-root=fixtures/agent-session-health ...` — rollout critical·누락 cwd warning fixture PASS
- `node scripts/recover-orca-stale-repos.mjs --data=fixtures/orca-stale-repos/orca-data.json` — stale 1 → 0, 잔여 참조 0 fixture PASS
- `node scripts/check-goal-19.mjs` — typecheck·lint·test·build·Goal fixture 전체 PASS. sandbox build는 Google Fonts fetch 차단으로 실패했고 동일 게이트를 network-capable 권한에서 재실행해 PASS

## 남은 사람 게이트

Yohan Agent Kit main worktree에는 기존 사용자 변경이 있으므로 직접 수정하지 않는다. 별도 worktree를 만들고 3개 범용 스킬·manifest·registry/catalog·fixture를 구현하는 저장소 밖 쓰기 승인이 다음 게이트다. 이 게이트에는 실홈 설치, vendor 실호출, release, push, PR, merge, publish가 포함되지 않는다.

## 2026-08-24 재검증

- VHK를 npm 설치 가능 최신판 `2.14.0`으로 갱신하고 전체 완료 `next-task.md`를 재생성했다.
- live Orca 데이터에 대한 두 복구 스크립트의 직접 apply를 차단하고, 격리 복사본도 `--confirm-offline-copy` 없이는 쓰지 못하게 했다.
- trace 검사는 기본 8MB bounded tail로 제한하고 시간창 coverage 부족을 경고하며, 출력 절대경로를 마스킹한다.
- Goal 19 전용 검사, 프로젝트 정책, VHK verify 5/5, `git diff --check`가 통과했다.
