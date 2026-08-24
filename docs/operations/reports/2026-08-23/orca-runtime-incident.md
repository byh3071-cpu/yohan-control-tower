---
report_id: 2026-08-23-orca-runtime-incident-1
report_type: runtime-incident
task_id: unavailable-runtime
dispatch_id: unavailable-runtime
attempt: 1
status: partial
owner_role: conductor-fallback-investigator
branch: master
git_ref: dirty-worktree@cf61612
delivery: pending-runtime
created_at: 2026-08-23T13:47:17+09:00
---

# Orca 런타임 사고 — 지휘자 대체 조사

## 1. 판정

- Severity: **SEV3 — 로컬 조정 기능 저하**
- Incident status: **지휘자 RPC 직접 원인 분리, 앱 재시작 원인 미확정**
- 영향 범위: 디자인팀 최종 보고, 독립 QA 검토, 장애 조사 결과의 Orca 인수·전달
- 비영향 범위: production 서비스와 고객 데이터. 이 프로젝트는 로컬 전용이며 외부 배포 장애는 관측되지 않았다.
- 데이터 상태: 디자인 worktree의 변경과 QA 영수증은 남아 있다. 독립 QA 보고는 Orca Task result에서 회수됐다. 독립 장애 조사 보고는 생성되지 않았다.

이 문서는 고용된 독립 장애 조사자의 결과가 아니다. 해당 조사 Dispatch는 provider가 없는 재사용 terminal에서 실패해 보고서나 transcript를 남기지 못했다. 현재 지휘자가 read-only 증거와 신원별 A/B RPC로 작성한 **대체 조사**다. 지휘자 RPC 실패의 직접 원인은 높은 확신도로 분리했지만, Orca 앱 재시작과 graph Git 오류의 근본 원인은 확정하지 않는다.

## 2. 현재 영향과 안전 조치

`orca status`의 건강 판정만 신뢰하면 새 worker를 중복 실행할 위험이 있다. 기본 실행 신원 `CodexSandboxOffline`에서는 13:47 KST에 status가 runtime `ready`, `reachable: true`를 반환했지만 바로 다음 `orchestration run-list`는 `runtime_unavailable`로 실패했다. 같은 runtime ID에 대해 sandbox 밖 사용자 신원의 동일 read RPC는 성공했다. 공개 Orca 이슈 [#13539](https://github.com/stablyai/orca/issues/13539)가 설명한 Windows named-pipe DACL과 같은 재현 형태다.

따라서 현재 **지휘자 CLI 실패의 직접 원인은 sandbox 신원과 Orca named pipe 권한의 불일치**로 판정한다. [추론, 확신 높음] 원시 connect errno와 live pipe DACL을 직접 캡처하지 않았으므로 ‘확정’이 아니라 높은 확신도다. Orca 재시작은 같은 DACL을 다시 만들 가능성이 커 기본 해결책으로 사용하지 않는다.

현재 적용한 완화 조치는 다음과 같다.

- 추가 Orca 재시작, 프로세스 강제 종료, DB 수정, worktree 삭제를 하지 않았다.
- 같은 디자인팀·검토자·조사자를 재고용하지 않았다.
- 세 worktree의 Git 상태, Orca Task result, Dispatch 상태를 read-only로 대조했다.
- Orca 전달이 복구될 때까지 프로젝트 보고서를 내용 영수증으로 먼저 남긴다.

## 3. 타임라인

| 시각 (KST) | 관측 |
| --- | --- |
| 10:36:44 | main trace에서 이번 파일의 첫 `spawn git ENOENT`가 기록됐다. 이후 13:58까지 실패 5,375건과 성공 3,777건이 섞였다. Git 오류는 12:51 재시작보다 먼저 존재했다. |
| 12:51:52 | Orca main process PID 34768의 lifecycle start가 trace에 기록됐다. 이 시점은 재시작 뒤 새 main process 기동으로 해석할 수 있지만 최초 종료 원인은 기록만으로 알 수 없다. |
| 12:55:31 | 디자인 독립 QA Task가 생성됐다. |
| 13:10:17 | 독립 QA가 `BLOCKED — P0 1건, P1 6건` worker report를 Task result에 남기고 completed 됐다. target worktree에 report 파일을 쓰지 않은 것은 read-only 계약과 일치한다. |
| 13:14:47 | 디자인 worktree terminal이 exit code 1로 종료된 것을 같은 세션의 terminal 관측에서 확인했다. 디자인 파일 변경과 QA 영수증은 남았다. |
| 13:15 전후 | runtime이 `starting`, `reachable: false`로 관측됐다. |
| 13:23 전후 | status가 잠시 `ready`를 반환했지만 실제 Run·Task·Inbox·Terminal 조회는 `runtime_unavailable`로 실패했고 다시 `starting`이 관측됐다. |
| 13:38~13:46 | 장애 조사 worktree와 terminal이 준비됐고 실제 supervised Dispatch는 13:46:30에 재사용 terminal로 열렸다. effective agent·model·effort는 모두 null이었다. |
| 13:47 | status는 `ready/reachable`이었지만 직후 `orchestration run-list`가 `runtime_unavailable`로 실패했다. 건강 판정과 실제 RPC가 불일치함을 재현했다. |
| 14:00 전후 | 같은 runtime ID에 sandbox 밖 사용자 권한으로 실행한 `run-list`가 성공했고 기존 QA Task result와 조사 Dispatch를 회수했다. |
| 14:02:18 | 조사 Dispatch가 `Agent process stop was requested but never confirmed`, `termination_reason: unknown`, terminal `stop_unverified`로 failed 됐다. heartbeat와 조사 report는 없다. |

## 4. 실패 계층별 조사

| 계층 | Expected | Observed | Verdict |
| --- | --- | --- | --- |
| Orca app process | app과 창이 살아 있고 runtime을 안정적으로 제공 | app PID 34768과 창은 사용 가능 | app 생존은 확인. runtime 건강의 충분조건은 아님 |
| orchestration runtime·DB·API | status와 실제 Run·Task·Inbox RPC가 같은 실행 신원에서 일치 | sandbox 신원 RPC는 실패, sandbox 밖 동일 RPC는 같은 runtime ID로 성공 | runtime 자체는 사용 가능. **Codex sandbox transport 권한 불일치** |
| terminal daemon·session | worker session이 결과를 남기고 종료 상태가 인수됨 | 독립 QA는 Task result 전달 성공. 조사 terminal은 provider receipt 없이 `stop_unverified` | daemon 일부 생존, 조사 Dispatch 구성·종료 실패 |
| provider CLI·model | 역할별 provider가 명시되고 보고서와 receipt 생성 | 독립 QA의 Claude worker는 완료. 조사 Dispatch effective agent·model·effort는 모두 null | 조사에는 관리되는 provider가 실질적으로 시작되지 않은 것으로 판단 |
| Git·worktree·project command | Orca와 현재 shell 모두 Git을 안정 실행 | trace의 Git 9,857건 중 ENOENT 5,375건·성공 3,777건. 실패의 5,228건은 worktree. 현재 shell Git 성공 | 특정 graph/worktree 실행 경로의 대규모 간헐 실패. 재시작·RPC 권한과 직접 인과 미확정 |

## 5. 관측 사실, 가설, 반증 조건

### 관측 사실

- 기본 실행 신원은 `CodexSandboxOffline`이다. 이 신원의 `run-list`는 `runtime_unavailable`이지만 sandbox 밖 동일 명령은 같은 runtime ID로 성공한다.
- 독립 QA Task는 13:10에 completed 됐으며 target worktree 파일 대신 Orca Task result에 `BLOCKED — P0 1건, P1 6건`을 남겼다.
- 조사 Dispatch는 effective agent·model·effort가 모두 null이고 재사용 terminal에서 heartbeat·report 없이 `stop_unverified`로 failed 됐다.
- Orca main trace에는 여러 저장소 graph/worktree refresh의 `spawn git ENOENT`가 10:36부터 반복되며, 이는 12:51 재시작보다 앞선다.
- ENOENT와 성공 Git 호출이 같은 trace에 대량으로 섞여 있다. 전체 Git 호출 수와 실패·성공 수가 일치하지 않는 나머지는 ENOENT 이외의 정상적인 Git exit failure다.
- 현재 지휘자 shell에서는 세 worktree의 `git status`와 `git log`가 성공한다.
- 디자인 worktree에는 수정 파일 6개, 미추적 계약 문서 2개와 QA 영수증이 있다.
- 독립 검토 worktree와 장애 조사 worktree는 기준 ref `cf61612`에서 깨끗하다. 전자는 read-only Task result가 있고 후자는 결과가 없다.

### 원인 판정

1. **지휘자 CLI `runtime_unavailable` 직접 원인: Windows sandbox named-pipe 권한 불일치** — [추론, 확신 높음]
   - 지지 증거: 같은 app·runtime ID·명령이 `CodexSandboxOffline`에서는 실패하고 sandbox 밖 사용자 신원에서는 성공한다. Orca 공개 이슈 #13539의 재현·오류 변환과 일치한다.
   - 남은 간극: 이 환경의 pipe DACL과 connect errno `EPERM`을 직접 캡처하지는 않았다.
   - 반증 조건: 같은 시각·runtime ID에서 sandbox 신원의 직접 pipe probe가 정상 연결되고 실제 read RPC도 반복 성공한다.
2. **장애 조사 보고 미생성 직접 원인: provider 없는 terminal 재사용 Dispatch** — [추론, 확신 높음]
   - 지지 증거: start options의 requested/effective agent·model·effort가 모두 null이고, terminal은 reused, heartbeat 없음, transcript fallback은 `session_not_reported`, 종료는 `stop_unverified`다.
   - 남은 간극: coordinator가 왜 provider 없는 terminal을 선택했는지 호출 원문은 회수하지 않았다.
   - 반증 조건: 해당 Dispatch의 별도 hook transcript나 provider receipt가 발견돼 실제 managed agent가 시작됐음이 증명된다.
3. **graph/worktree Git child-process 실행 경로의 간헐 실패** — [추론, 확신 중간]
   - 지지 증거: ENOENT 5,375건 중 worktree가 5,228건이고 여러 repo에 burst로 반복된다.
   - 약화 증거: 재시작 전부터 존재하고 같은 trace에서 worktree 성공도 1,821건이다. 따라서 전역 Git 미설치나 재시작 단일 원인으로 설명되지 않는다.
   - 반증 조건: Orca graph의 각 실행 경로·env·cwd를 고정한 최소 재현에서 실패가 사라지거나, 실패가 존재하지 않는 cwd에만 한정됨이 증명된다.
4. **Orca 앱 재시작 원인** — **미확정**
   - 이전 PID 종료와 새 PID 기동은 확인했지만 crash stack, 종료 요청 주체, 최소 재현이 없다.
   - sandbox DACL은 재시작 뒤 지휘자 접근 실패를 설명하지만 재시작 자체를 설명하지 않는다.
5. **Claude Code 검토가 Orca 재시작을 직접 유발** — [추론, 확신 낮음]
   - 지지 증거가 없다. 오히려 Claude worker는 재시작 뒤 Task result를 정상 전달했다.
   - crash stack이나 최소 재현이 생기기 전에는 원인 후보로 승격하지 않는다.

**정리:** 지휘자 RPC 실패와 조사 보고 미생성의 직접 원인은 각각 높은 확신도로 분리됐다. **앱 재시작 원인: 미확정.** Git ENOENT는 별도 graph/worktree 결함 후보이며 세 현상을 하나의 원인으로 합치지 않는다.

## 6. 복구와 재발 방지 게이트

다음 순서를 지키기 전 새 Dispatch를 만들지 않는다.

1. worker를 시작할 **같은 실행 신원**에서 `status`뿐 아니라 Run·Task 같은 harmless read RPC를 capability preflight로 실행한다.
2. sandbox RPC가 실패하면 무조건 runtime 장애로 부르지 말고, 사람 승인 read-only 사용자 신원 비교로 transport 권한 문제를 분리한다. 전면 sandbox 해제는 기본 우회책으로 채택하지 않는다.
3. 기존 Run·Task·Dispatch·Inbox를 먼저 조회해 중복 worker와 미전달 `worker_done`을 대조한다.
4. terminal 상태, worktree diff, Task result, 프로젝트 보고서, 전달 영수증을 Task별로 결합한다.
5. read-only worker가 payload로만 보고했으면 지휘자가 내용을 프로젝트 보고서에 물질화하고 원본 message ID를 남긴다.
6. provider 작업을 시작할 때 requested·effective agent/model/effort와 exact worker identity를 즉시 검증한다. provider가 필요한데 effective agent가 null이면 작업 입력을 보내지 않는다.
7. file-producing browser 도구를 read-only target worktree에서 실행하지 않는다. 필요하면 격리 출력 위치와 사후 diff 0을 Completion Check로 둔다.
8. 조사 재시도가 필요하면 기존 failed Dispatch를 보존하고 새 `attempt`를 열되, explicit provider와 새 terminal을 지정한 계획을 사용자에게 보고한다.
9. Orca 재시작은 named-pipe DACL 해결책이 아니며 사람 하드게이트로 남긴다.

### 후속 항목

| 우선순위 | 소유자 | 항목 | 완료 증거 |
| --- | --- | --- | --- |
| P0 | 지휘자 | sandbox 권한 실패와 runtime 장애를 신원별 실제 RPC로 분리 | same-runtime A/B 영수증 |
| P0 | 디자인팀 | 독립 QA P0 1건·P1 6건 수정과 dirty 계약·최종 보고 보존 | 고정 Git ref + `design-final` 보고서 |
| P1 | 독립 QA 검토자 | 수정 ref를 file-producing 부산물 없이 재검토 | 프로젝트 소유 독립 검토 보고서 |
| P1 | Agent Kit 소유자 | capability preflight, provider launch receipt, payload materialization을 범용 스킬 계약에 반영 | vendor smoke probe |
| P1 | Orca upstream | 공개 #13539를 추적하고 중복 이슈를 만들지 않음 | fix version 또는 공식 workaround |
| P2 | Orca 조사 소유자 | Git spawn 실패를 graph/worktree 코드 경로별 최소 재현 | 비밀값 제거 재현 로그, 관련 이슈 중복 검색 |

## 7. Provider receipt

- 작성 역할: 상시 지휘자 / 대체 사고 조사자
- runtime/provider: 현재 Codex 세션의 로컬 shell 및 Orca public CLI read-only 관측
- 사용 규약: `engineering:incident-response`, `orchestration`, `orca-cli`, Goal 16 운영 매뉴얼
- 독립 조사자 대체 여부: **대체함**
- 제약: sandbox 신원 RPC 불가, 독립 조사 provider receipt·stderr 미수신, named-pipe DACL·connect errno 직접 캡처 안 함, DB 직접 열람 안 함
- 정확한 다음 행동: **디자인팀은 회수된 QA P0/P1을 수정하고, 지휘자는 새 worker 전에 같은 실행 신원의 실제 RPC와 explicit provider launch receipt를 검증한다.**
