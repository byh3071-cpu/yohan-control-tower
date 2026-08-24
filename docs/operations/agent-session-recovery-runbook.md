# 에이전트 세션 복구·재발 방지 런북

- Status: ACTIVE
- Owner: 상시 지휘자
- Last verified: 2026-08-23 (Asia/Seoul)
- Applies to: Orca에서 실행하는 Codex·Claude Code 등 provider 세션
- Related Goal: `goals/19-agent-session-runtime-recovery.md`

## 1. 이번 사고의 확정 범위

### 관측 사실

- `permit`의 Codex child process는 `memory allocation of 536870912 bytes failed`를 남기고 종료됐다.
- 해당 rollout은 약 203.75MB였고 한 스레드에 대형 tool output과 compaction 기록이 누적돼 있었다.
- Orca는 존재하지 않는 로컬 repo/worktree 경로 13개를 약 30초 간격으로 다시 탐색하며 `spawn git ENOENT`를 반복했다.
- 같은 시각 다른 cwd의 Git 호출은 성공했다. Git 미설치가 아니라 **존재하지 않는 cwd 등록**이 직접 원인이었다.
- Orca 공식 `project setup-delete` 경로로 13개 등록을 제거한 뒤 `orca-data.json` dry-run은 `staleCount: 0`, 잔여 참조 0을 반환했다.
- 현재 Codex sandbox에서는 Orca named-pipe RPC가 실패할 수 있지만 같은 runtime의 사용자 신원 RPC는 성공한다. sandbox RPC 실패만으로 Orca 전체 다운을 판정하면 안 된다.
- 외부 worktree가 `externalWorktreeVisibility: hide`일 때 `terminal create --worktree path:<external>`은 handle 대기 시간 초과가 발생했다. 본 저장소 terminal에서 먼저 생성한 뒤 명령이 외부 worktree로 이동하게 하자 실제 cwd·branch가 올바른 새 세션이 만들어졌다.

### 원인 판정

1. **`permit` provider 종료:** 초대형 rollout을 다시 적재하는 과정의 메모리 할당 실패 — `[추론, 확신 높음]`
2. **반복 `spawn git ENOENT`:** Orca에 남은 존재하지 않는 cwd 등록 — `[사실, 확신 높음]`
3. **현재 세션의 sandbox `runtime_unavailable`:** runtime 전체 장애가 아니라 named-pipe 실행 신원 차이 — `[추론, 확신 높음]`
4. **외부 worktree terminal handle timeout:** visibility/UI terminal 채택 경로 결함 — `[추론, 확신 중간]`

최초 Orca 앱 재시작을 촉발한 단일 사건은 crash stack이 없어 `not established`로 유지한다.

## 2. 절대 먼저 하지 않는 것

- 큰 thread를 그대로 resume하지 않는다.
- 앱 재시작, terminal 종료, DB 수정, worktree 삭제를 첫 조치로 사용하지 않는다.
- `status=ready` 한 줄 또는 `runtime_unavailable` 한 줄만으로 전체 runtime 상태를 확정하지 않는다.
- 보고 파일을 찾기 전에 동일 역할 worker를 다시 고용하지 않는다.
- original coordinator가 살아 있을 때 takeover하지 않는다.
- dirty worktree의 파일을 정리·복원·커밋하지 않는다.

## 3. 세션 시작 전 60초 점검

저장소 루트에서 다음을 실행한다.

```powershell
npm run session:health
node scripts/recover-orca-stale-repos.mjs
orca status --json
orca terminal list --json
```

판정 기준은 다음과 같다.

| 신호 | 판정 | 조치 |
| --- | --- | --- |
| rollout 64MB 이상 | warning | 새 thread를 우선하고 handoff SoT를 작성한다 |
| rollout 128MB 이상 | critical | 기존 thread resume 금지, 내용/전달 영수증을 백업하고 새 세션으로 인계한다 |
| Windows commit 85% 이상 | warning | 대형 worker fanout과 복수 provider 동시 기동을 줄인다 |
| Windows commit 95% 이상 | critical | 새 provider 기동을 중단하고 살아 있는 세션의 증거부터 보존한다 |
| 최근 10분 누락 cwd ENOENT 1~9건 | warning | repo 등록과 실제 경로를 대조한다 |
| 최근 10분 누락 cwd ENOENT 10건 이상 | critical | 신규 세션 생성을 멈추고 stale 등록을 공식 API로 제거한다 |

`session:health`는 rollout의 **파일 크기와 수정 시각만 읽고 본문은 열지 않는다.** 기본 실행은 관측을 위해 exit 0이며, 자동화에서 경고를 실패로 처리하려면 `--strict`를 붙인다.

## 4. 복구 순서

### A. 내용 보존

1. project 규칙과 `.vhk/HARD_STOP`을 확인한다.
2. worktree, branch, HEAD, dirty 상태를 기록한다.
3. 프로젝트 보고서, Goal Evidence, QA 영수증, handoff 파일을 찾는다.
4. 대형 thread는 원본을 삭제하지 않고 `%APPDATA%\orca\recovery-backups\<incident-id>`에 복사 영수증을 둔다.
5. prompt·tool output 본문 전체를 새 보고서에 복제하지 않는다.

### B. 운송 상태 대조

1. `orca status --json`과 harmless read RPC 하나를 **같은 실행 신원**에서 모두 확인한다.
2. sandbox RPC만 실패하면 사용자 신원의 read-only 호출과 A/B 비교한다.
3. 기존 terminal·Run·Task·Dispatch·Inbox를 조회한다.
4. 내용 영수증과 `worker_done` 전달 영수증을 대조한다.
5. 내용이 있으면 작업을 다시 하지 않고 전달만 복구한다.

### C. stale 등록 정리

1. `node scripts/recover-orca-stale-repos.mjs`로 개수·ID·digest를 dry-run한다. 이 스크립트는 live `%APPDATA%/orca`에 apply하지 못하도록 fail-closed이며, 쓰기는 `--data=<격리 복사본> --apply --confirm-offline-copy`에만 허용된다.
2. 존재하는 repo/worktree가 대상이면 즉시 중단한다.
3. Orca가 실행 중이면 offline JSON 수정 대신 공식 명령을 사용한다.

```powershell
orca project setup-delete --setup <exact-setup-id> --json
```

4. 제거 후 dry-run이 `staleCount: 0`이고 `residualReferences: []`인지 확인한다.
5. 필요할 때만 한 번 재시작하고 같은 검사를 반복한다. live 데이터는 공식 Orca 명령만 사용하고, 동일 대상에 offline 복사본 apply와 공식 삭제를 연속 수행하지 않는다.

### D. 새 세션 인계

1. 원래 worktree를 재사용하고 새 branch를 임의로 만들지 않는다.
2. 새 terminal이 열리면 파일 수정 전 `cwd`, branch, HEAD, dirty, HARD_STOP, active Goal을 ACK하게 한다.
3. 인계문은 채팅 요약이 아니라 프로젝트 소유 handoff 경로를 가리킨다.
4. ACK에는 최소한 `실제 cwd · branch · HEAD · dirty · Goal · 다음 사람 게이트`를 넣는다.
5. ACK 전에는 구현을 시작하지 않는다.

외부 worktree handle 생성이 timeout이면 다음 우회를 허용한다.

```powershell
orca terminal create `
  --worktree path:<registered-repo-root> `
  --title <recovery-title> `
  --command "Set-Location -LiteralPath '<external-worktree>'; codex" `
  --json
```

이 경우 Orca terminal 메타데이터는 repo root를 가리킬 수 있다. 완료 판정은 terminal 화면의 실제 `cwd`, Git branch, worktree clean/dirty ACK로 한다.

## 5. 이번 복구 영수증

| 대상 | 결과 | 영수증 |
| --- | --- | --- |
| stale repo 등록 13개 | 공식 제거 완료 | dry-run `staleCount: 0`, repo 44, residual 0 |
| 누락 cwd 반복 | 최근 10분 0건 | `npm run session:health` |
| `permit` 대형 thread | 재개 금지·원본/DB/terminal history 백업 | `%APPDATA%\orca\recovery-backups\2026-08-23-permit-01a028d3` |
| 새 디자인팀 | handoff ACK 완료 | terminal `term_5edaee34-4fcf-4cab-a53a-e726a60ada32`, 실제 디자인 cwd·branch·Goal 15 확인 |
| 새 메인 세션 | handoff ACK 완료 | terminal `term_c3a2619a-db72-49f8-9119-c4980703cb91`, 실제 main cwd·branch·HEAD·dirty 37파일·Goal 14 DONE 확인 |

## 6. 재발 방지 운영 규칙

- 64MB warning이 뜨면 세션을 더 길게 유지하지 말고 project handoff를 갱신한다.
- 128MB critical thread는 새 세션에서 재개하지 않는다. 필요한 사실·결정·미해결 gate만 정본에서 회수한다.
- 역할별 단일 writer, `report_id`, `attempt`, 내용/전달 이중 영수증을 사용한다.
- 디자인팀은 `design-team`, 감독은 `supervised-session-conductor`, 재시작 인계는 `restart-safe-handoff`, 장애 원인 분리는 `runtime-incident-investigator`, Orca 운송은 live `orchestration`/`orca-cli`가 소유한다.
- 사용자에게는 역할별 채팅을 나열하지 않고 결론·증거·불일치·위험·다음 사람 게이트 하나로 보고한다.

## 7. 종료 조건

복구는 앱이 켜졌을 때가 아니라 다음이 모두 참일 때 끝난다.

- stale 등록 0, 최근 누락 cwd ENOENT 0
- 보존 대상 worktree의 ref·dirty 상태 확인
- 새 세션의 cwd·branch·Goal ACK
- 중복 writer 0
- 내용 영수증과 전달 영수증의 상태가 각각 명시됨
- 다음 사람 게이트가 정확히 하나로 정리됨
