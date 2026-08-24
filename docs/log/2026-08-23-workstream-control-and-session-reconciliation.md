# 2026-08-23 메인·디자인·스킬 작업흐름 정산

## 목표

여러 Orca 탭을 보이는 개수로 정리하지 않고, 메인·디자인·스킬 작업의 소유권과 실제 산출물을 보존하면서 다음 행동을 재개한다.

## 관측과 판정

- `tower-workbench`의 구현 Task는 failed였지만 worktree에는 Goal 14 범위의 미커밋 코드가 남아 있었다. 따라서 종료 대상이 아니라 인수감사 대상으로 분류했다.
- 디자인 coordinator는 독립 QA의 P0 1건·P1 6건을 근거로 실제 최소 수정 중이었다. 중복 지시를 보내지 않았다.
- Agent Kit 세션은 빈 셸이 아니라 `goal-cycle` 확장 계획 승인 대기 상태였다. 동시에 Goal 5·8·10이 `IN_PROGRESS`라 새 Goal을 즉시 만드는 제안은 프로젝트 규칙과 충돌했다.
- 메인·Agent Kit에 보낸 재개 요청은 RPC에서 `agent_prompt_stalled`를 반환했지만, terminal 화면에서 두 요청 수신과 실제 작업 시작을 확인했다. 전달 오류와 작업 수신을 분리했다.
- 완료된 Goal 13 재검수 worker는 exact Dispatch로 release를 시도했다. transcript archive와 terminal close는 수행됐고 `worker-show` 관측은 `exited`, connected false, residual resources 0이었다. 다만 Windows stop 확인 실패 때문에 Orca 상태는 `release_unknown`으로 남았다. 같은 요청 재생 후에도 동일해 추가 종료를 중단했다.
- 디자인 QA·조사 worker의 `release_unknown`과 dirty worktree는 강제 정리하지 않았다.
- 메인 Goal 14 인수감사에서 기존 구현이 완료된 Goal 4의 Calendar 진입점을 제거한다는 계약 충돌이 발견됐다. 기존 Goal 14 설계 보고가 “개요/캘린더 모드 토글 유지, 탭 추가 없음”을 명시하므로, Calendar를 Home 내부 모드 전환으로 복원하고 로컬 격리 Playwright·담기 흐름 검증을 진행하도록 지휘 결정했다.
- Agent Kit 감사 결과 Goal 10 구현은 PR #77·#80, Goal 5 구현은 PR #79 계보로 main에 도달했지만 Goal 5 카드의 PR #74 완료조건이 stale한 것으로 판정됐다. Goal 8 실제 네 벤더 final evidence는 미완료다. Goal 5 조건을 PR #79 대체 증거로 supersede하고 fresh Goal 5·10 gate 뒤 두 Goal을 DONE으로 정산하는 G0를 단일 사람 게이트로 올렸다.
- 메인 Goal 14는 지휘 결정대로 Calendar를 새 탭 없이 Home 내부 `개요 / 캘린더` 모드로 복원했다. typecheck·lint·81/81 test·build·VHK verify 5/5·Goal check/done·Playwright가 통과했고 디자인 QA는 P0/P1/P2 0이다. Goal 14는 `DONE`; commit·push·PR은 하지 않았다.
- 디자인팀은 6개 폭과 candidate·misleading 두 변형의 Browser QA 178/178, console/page error 0을 확보했다. 최초 P0 1·P1 6과 후속 P1 2를 보정하고 증거 묶음을 로컬 commit `4395bd0`에 보존했다. 기술 통과를 제품 승인으로 과장하지 않고 실제 사용자 5과제·보조기술/터치·최종 미감 게이트를 남겼다.
- 디자인 조사 보고는 Orca 문제를 roster 단일 원인이 아니라 worker 종료 조정, 메시지 전달, cold-start prompt race, worktree selector/fallback, 샌드박스 경계의 복합 문제로 분류했다. runtime 인증값 노출은 별도 보안 사건으로 분리했고 값은 재기록하지 않았다.
- Claude Code 최종 읽기 전용 검수는 직전 P1 두 건의 해소·오탐 정정을 확인했고 새 P0/P1을 찾지 못했다. 요청한 구조화 `VERDICT` 리터럴과 P2 개수는 출력하지 않아 형식 준수 미달을 숨기지 않고, 기술 감사의 P0/P1 부재만 수용했다.
- 디자인 증거는 로컬 commit `4395bd0`, 최종 QA·오케스트레이션 조사 보고는 로컬 commit `d0e8d26`으로 보존했다. push·PR·merge·production handoff는 수행하지 않았다.
- 디자인 coordinator의 직접 전달 시도에서는 Orca 1.4.188 `status`가 ready·reachable인데도 `terminal list`가 두 번 `runtime_unavailable`을 반환했다. 재시작하지 않고 전달 장애 증거를 로컬 commit `861c856`에 보존했다. 지휘자는 이미 알고 있던 exact terminal handle의 읽기 경로로 보고서를 독립 회수했으므로 내용 인수는 성공했다.
- 디자인 coordinator는 자신이 띄운 QA 서버를 종료하고 Playwright 임시 부산물 부재, `src/` 변경 0, Git clean을 확인했다.
- 사용자가 Agent Kit G0를 승인해 Run `run_201d4321f818`, Task `task_65d31a6835f1`, Dispatch `ctx_c8a27a240ff2`로 기존 Agent Kit 세션에 범위를 고정해 전달했다. `worker-start`는 coordinator principal 불일치로 `consumer_fenced`였으므로 takeover나 새 writer를 만들지 않고 기존 세션에 `dispatch --inject`했다.
- Agent Kit Goal 5에는 PR #74가 `CLOSED`·Draft·미병합이라는 사실과 identity `916d00d...` → verification `1f7d274...` → PR #74 head `8d839b3...` → PR #79 head `41f3cdd...` → PR #79 merge `fff7b17...` 대체 계보를 기록했다. Goal 5 fresh gate와 `goal done`이 PASS해 `DONE`으로 전이했다.
- Goal 10 fresh gate 첫 실행은 테스트 fixture 디렉터리의 샌드박스 쓰기 거부로 실패했다. 동일 gate를 정상 권한으로 재실행해 PASS했고 공식 `goal done`도 PASS해 `DONE`으로 전이했다. Goal 8은 `goals/8-two-machine-four-vendor-validation.md` 내용·증거를 바꾸지 않고 `IN_PROGRESS`로 보존했다.
- 최종 Agent Kit diff는 `goals/5-yohan-agent-kit-identity.md`, `goals/10-claude-auto-session-title.md` 두 파일뿐이고 `git diff --check`가 PASS했다. Dispatch는 `completed`, failure count 0이며 push·PR·merge·release·publish·실홈 설치·벤더 호출은 하지 않았다.
- 권한 TUI에 보낸 `orca terminal send --text p`는 승인 키가 아니라 일반 사용자 메시지로 큐잉됐다. 해당 단문은 진행 중 tool call 뒤 표시됐지만 새 파일·새 Goal·외부 작업을 만들지 않았고, 두 Goal diff와 완료 Dispatch를 다시 대조했다. 이후 권한 TUI는 terminal send가 아니라 플랫폼 승인 또는 fresh computer-use 상태로만 처리한다.

## 스킬 구조 판정

- `master-orchestrator`는 현재 이름과 달리 환경 상태·자동 PR 중심의 좁은 스킬이라 전체 지휘자 표준으로 확장하지 않는다.
- `design-team`은 도메인 품질, `orchestration`은 Run·Task·Dispatch 운송을 계속 소유한다.
- 감독·재시작 연속성·runtime 사고 대응은 `docs/operations/supervised-session-skill-requirements.md`를 Agent Kit 정본 구현의 입력으로 둔다.
- Agent Kit의 기존 `goal-cycle`이 이미 제공하는 역할·게이트·영수증과 신규 요구의 겹침을 먼저 감사한다. 단일 스킬 과적재 또는 중복 복사를 피한다.

## 다음

1. Agent Kit G0는 완료됐다. Goal 8 집 PC 네 벤더 실증은 실홈 설치·벤더 호출을 포함하므로 별도 사람 게이트 뒤에만 시작한다.
2. 메인 Goal 14의 미커밋 diff·5개 캡처·기존 전역 진단을 사람 검토 게이트에서 판정한다.
3. 디자인 후보 A의 미감·밀도와 실제 사용자 5과제 범위를 사람 게이트에서 판정한다.
4. Goal 8 완료 뒤 기존 `goal-cycle` 보강과 신규 감독·연속성·사고대응 스킬을 전용 Goal로 구현한다.

## 금지 유지

- broad terminal close, worktree 삭제, Orca 재시작
- Agent Kit 새 Goal·전역 설치를 증거 없이 시작
- 디자인 최종 보고 전에 production handoff
- commit·push·PR Ready·merge·release·publish
