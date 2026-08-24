# 디자인팀 인수 상태와 Orca 런타임 사고 증거 고정

- Date: 2026-08-23 (Asia/Seoul)
- Goal: 17
- Status: 정본 회수 뒤 정정 게이트 통과

## 수행

- 디자인, Claude Code 검토, 장애 조사 worktree를 read-only로 대조했다.
- 디자인 기술 QA와 실제 사용자 QA를 분리하고 최종 보고 미수신을 기록했다.
- `orca status`의 `ready/reachable` 직후 실제 orchestration RPC가 `runtime_unavailable`인 불일치를 재현했다.
- 고용된 조사자의 산출물이 없으므로 지휘자 대체 사고 보고서를 provenance와 한계를 명시해 작성했다.
- sandbox 밖 read-only RPC에서 독립 QA Task result를 회수해 기존 `미수신` 판정을 `수신 · BLOCKED`로 정정했다.
- 조사 Dispatch가 effective agent·model·effort null인 재사용 terminal에서 `stop_unverified` failed 됐음을 확인했다.
- `CodexSandboxOffline`과 sandbox 밖 사용자의 동일 runtime A/B에서 지휘자 RPC 실패를 named-pipe 권한 문제로 분리했다.
- Git ENOENT가 Orca 재시작 전부터 존재하고 성공 호출과 섞였음을 통계로 확인해 재시작·RPC 실패와 분리했다.
- 재시작·강제 종료·DB 수정·재고용 없이 안전 복구 게이트를 정했다.

## 결정

- candidate A는 구조 후보로 유지하고 QA P0 1건·P1 6건 수정, 실제 사용자 5개 과제, 독립 재검토 전 production handoff를 차단한다.
- 지휘자 RPC 실패는 sandbox named-pipe 권한 불일치로 판정한다. 앱 재시작 원인과 Git child-process 실패의 인과는 `미확정`으로 둔다.
- Agent Kit 표준화는 현재 보고 인수와 Agent Kit의 기존 Goal 8 사람 게이트 뒤에 진행한다.

## 검증

- `scripts/check-goal-17.mjs`: 독립 QA 차단 판정, 조사 provider 미기동, 신원별 A/B, 미확정 범위와 문서 계약 검사 PASS.
- typecheck, lint, test, build: PASS.
- `npm.cmd run vhk -- goal check --id 17 --force`: 정정 후 PASS.
- 첫 검증의 Google Fonts 네트워크 차단은 네트워크 허용 동일 명령에서 해소됐다. 정정 검증 build는 동일 허용 범위에서 PASS했다.
- `git diff --check`: whitespace error 없음. 기존 `docs/state/next-task.md` 줄바꿈 경고만 관측했다.
