# 현재 작업흐름 관제 보드

- Status: ACTIVE COORDINATION SNAPSHOT
- Updated: 2026-08-24 14:12 KST
- Owner: 상시 지휘자
- Scope: yohan-control-tower main · 독립 디자인팀 · Yohan Agent Kit
- Durable method: `docs/operations/design-team-supervision-runbook.md`

이 문서는 현재 지휘 상태를 빠르게 이어받기 위한 얇은 보드다. 작업 내용의 정본을 대체하지 않는다. 실행 전에는 아래 우선순위로 다시 확인한다.

```text
프로젝트 Goal·규칙
→ Git/worktree의 실제 ref·dirty 상태
→ Orca Run·Task·Dispatch
→ terminal의 실제 화면
→ 채팅 요약·기억
```

## 1. 세 작업흐름

| 흐름 | Owner | 현재 상태 | 확인된 증거 | 단일 다음 행동 | 하드게이트 |
| --- | --- | --- | --- | --- | --- |
| 메인 제품 | `tower-workbench` Goal 14 세션, 지휘자 감독 | `ACCEPTED_PENDING_HUMAN_REVIEW` | Calendar를 새 탭 없이 Home 내부 `개요 / 캘린더` 모드로 복원했다. typecheck·lint·81/81 test·build·VHK verify 5/5·Goal check/done·Playwright가 PASS했고 `design-qa.md`는 P0/P1/P2 0이다. Goal 14는 `DONE`; commit·push·PR은 하지 않았다. | 미커밋 diff와 5개 캡처를 검토하고 기존 전역 `npm run check` 진단 및 `.playwright-mcp/` 포함 여부를 정한 뒤 별도 commit 게이트 | 기존 전역 진단: `YOHAN_OS_ROOT` 오탐 2, vector `any` 2, 파일명 경고 20. 기존 PAT-002·NFT 경고 각 1. 범위 밖 보정 금지 |
| 디자인 | `codex/control-tower-design-direction` | `NOW_R3_IMPLEMENTED_VERIFIED · HANDOFF_ACKNOWLEDGED` | Goal 15·16은 DONE이다. NOW-R3는 실제 Goal 데이터와 360·432·768·1280·1440px, 상태 5종, 키보드·대비·경로 allowlist, VHK verify 5/5를 통과했고 로컬 commit `c176c3b`에 보존됐다. 새 디자인 세션이 같은 ref·승인 상태·다음 Goal 경계를 ACK했다. | `작업`의 할 일·일정·프로젝트 형제 보기를 다음 독립 Goal로 만들 범위 확정 | 후속 Goal 승인 전 다른 네 화면·전역 탐색명·배포 수정 금지. `vhk context`가 만든 디자인 worktree의 `.vhk/context.md` dirty를 이 closeout에서 건드리지 않음 |
| 스킬 | Yohan Agent Kit 표준 스킬 승격 | `SOURCE_VERIFIED · MAIN_ALIGNED · HOME_NOT_INSTALLED` | `feat/design-team-session-continuity` exact HEAD `a5aa50d`·clean을 새 지휘자가 읽기 전용으로 재확인했다. 공용 스킬 validator 4개, Goal 15, catalog 216자산, 멀티벤더 상태 전이 233 assertions가 PASS했다. 사용자 홈 표준 대상은 source Check 당시 각각 `Installable`이었으며 실제 설치는 하지 않았다. | `a5aa50d` push·Draft PR 생성 승인 요청 | current Brain↔MCP retrieval 계약 ref drift 때문에 Goal 16 cross-repo handshake는 현재 canonical checkout에서 FAIL. canonical Agent Kit main의 `goals/5`, `goals/10` dirty 보존. 실홈 설치·벤더 새 세션 호출·release·PR Ready·merge·publish는 별도 게이트 |

## 2. 세션 유지·정산 판정

| 대상 | 판정 | 근거 | 허용 행동 |
| --- | --- | --- | --- |
| 현재 지휘 세션 | Goal 20 `DONE`·handoff closeout 완료 | `master` `881b39b`에서 인수 ACK 후 공식 goal check/done이 typecheck·lint·test·build와 고유 14항목을 두 번 PASS했다. 디자인·메인 전달 accepted와 receiver ACK를 분리해 화해했고 이전 지휘자는 writer를 종료했다. | 로컬 closeout commit에서 멈추고 Agent Kit `a5aa50d` push·Draft PR 생성 사람 게이트를 기다림 |
| `permit` 디자인 세션 | crash 원본으로 격리 보존 | Codex child의 512MB allocation 실패, rollout 203.75MB. 원본 rollout·thread DB·terminal history를 별도 백업 | resume·중복 지시 금지. 증거 회수에만 사용 |
| 이전 디자인팀 세션 `term_5edaee34-...` | 작업 완료 후 현재 terminal 없음 | 실제 디자인 worktree에서 Goal 15·16을 완료하고 NOW-R3 구현·QA를 `c176c3b`로 커밋 | 새 독립 디자인 세션에 project handoff를 전달하고 ACK 전 구현 금지 |
| 이전 메인 세션 `term_c3a2619a-...` | Goal 14 인계 뒤 현재 terminal 없음 | `tower-workbench` HEAD `cfee44a`, dirty 구현·검증 증거 보존 | 새 메인 지휘자가 사람 검토 전 commit·push·PR·dirty 정리를 금지한다고 ACK |
| Yohan Agent Kit main worktree | 사용자 변경 보존 | branch `main`, HEAD `3a8b067`, origin보다 12 commit 앞, `goals/5`, `goals/10` dirty | 직접 수정·병합 금지. feature 통합은 `feat/design-team-session-continuity` 격리 worktree에서만 수행 |
| Goal 13 재검수 worker | 정산 시도 완료, `release_unknown` | `worker_done`, clean worktree, transcript archive 완료. `worker-show`는 exact worker `exited`, connected false, residual resources `[]`이나 Windows stop 확인이 불가하다. | 재시도·broad close 금지, Orca bookkeeping 잔여로 기록 |
| 디자인 독립 QA worker | 보존 | 보고는 수신됐지만 release가 `stop_unverified`로 남고 디자인 worktree가 dirty다. | 디자인 coordinator가 인수할 때까지 건드리지 않음 |
| 장애 조사 worker·외부 terminal | 보존 | provider 기동 증거가 없고 release가 `unknown` 또는 external이다. | 보고서 유무만 감사, 강제 종료 금지 |
| 실패한 Goal 14 구현 worker | 보존 | Dispatch는 failed지만 동일 worktree에 가치 있는 미커밋 구현이 있다. | 현재 Goal 14 세션이 출처를 정산하기 전 release 금지 |

## 3. 보고 인수 계약

각 흐름은 대화상 “끝남”이 아니라 다음 다섯 항목을 모두 충족해야 `ACCEPTED`다.

1. 프로젝트 정본 보고 또는 Goal Evidence
2. exact ref와 dirty 상태
3. 실행한 게이트와 PASS/FAIL 수치
4. 잔여 P0/P1 또는 명시적 `BLOCKED`
5. 다음 사람 게이트 한 개

`worker_done`은 운송 영수증이고 보고서는 내용 영수증이다. 둘 중 하나만 있으면 `PARTIAL`로 유지한다.

## 4. 현재 의사결정 순서

1. runtime stale 등록 13개는 공식 제거됐고 최근 10분 누락 cwd ENOENT는 0건이다. 128MB 이상 rollout 4개와 Windows commit 85% 초과는 계속 경고한다.
2. 메인 Goal 14는 `ACCEPTED_PENDING_HUMAN_REVIEW`로 인수했다. 미커밋 diff와 캡처는 다음 제품 검토 게이트까지 보존한다.
3. 디자인팀은 NOW-R3 선택과 첫 production 슬라이스를 완료했다. 다음은 `작업`의 세 형제 보기를 별도 Goal로 분리하며 다른 화면을 섞지 않는다.
4. 범용 스킬 소스 구현과 최신 local main 정렬은 `a5aa50d`에서 완료됐다. source 구현·canonical merge·home install·vendor discovery를 서로 다른 상태로 보고한다.
5. main·design delivery ACK는 완료됐다. 자동 정본화 부재는 Agent Kit #1 기존 이슈에 연결했고 중복 전송하지 않는다.
6. VHK 2.14.0 `context`의 생성 시각 비멱등성은 VHK #603에서 추적한다. 현재 구조 파생 갱신과 timestamp 노이즈를 구분한다.
7. 다음 사람 게이트는 Agent Kit `a5aa50d` push·Draft PR 생성 승인이다. merge와 사용자 홈 쓰기는 그 뒤의 별도 게이트다.

### Goal 14 Calendar 지휘 결정

- 기존 Calendar 진입점은 폐기하지 않는다.
- 탭은 5개 상한을 유지하고 Calendar 전용 탭은 만들지 않는다.
- Home 내부의 개요/캘린더 모드 전환으로 복원한다.
- 로컬 격리 Playwright 캡처와 담기 흐름 검증은 승인된 Goal 범위의 테스트다.

### Agent Kit 스킬 구조 결정

- 기존 `goal-cycle`은 벤더 중립 기안서·Goal 영수증 모드까지만 확장한다.
- `supervised-session-conductor`는 Task ownership, 단일 writer/read-only, report ledger, 충돌 조정, 단일 결정 보고를 소유한다.
- `restart-safe-handoff`는 attempt, 내용/전달 이중 영수증, coordinator 생존 확인, takeover·중복 writer 차단, worker release를 소유한다.
- `runtime-incident-investigator`는 App/Runtime/Terminal/Provider/Project 계층, timeline, 관측·추론, 반증, 복구와 근본 수정 분리를 소유한다.
- 정본은 Agent Kit `skills/<name>/`와 manifest이며 yohan-core에는 복제하지 않는다.

## 5. 실패 시 안전 기본값

- Orca 재시작은 복구 기본값이 아니다.
- `agent_prompt_stalled`는 전송 실패로 단정하지 않고 terminal 화면에서 실제 수신 여부를 확인한다.
- original coordinator가 살아 있으면 takeover하지 않는다.
- dirty worktree가 있으면 terminal·worker release보다 산출물 인수가 먼저다.
- `release_unknown`은 반복 종료 명령으로 덮지 않고 `exited` 관측과 archive 영수증을 함께 남긴다.
- Codex 권한 TUI에 `orca terminal send`를 사용하면 승인 키가 아니라 일반 사용자 메시지로 큐잉될 수 있다. 권한 창은 플랫폼 승인 또는 fresh UI 상태에 근거한 computer-use로 처리하고, 오입력 뒤에는 diff와 terminal tail로 부작용을 확인한다.
- 범용 스킬은 Agent Kit `skills/<name>/`가 정본이며, 프로젝트에는 요구사항과 포인터만 둔다.
- `vhk context` 직후 `.vhk/context.md` dirty는 사용자 코드 변경으로 단정하지 않는다. 구조 delta와 생성 시각·source ref churn을 diff로 분리하고 [VHK #603](https://github.com/byh3071-cpu/vhk/issues/603)을 근거로 남긴다.
- ACK 자동 정본화가 없다는 이유로 이미 ACK한 세션에 prompt를 다시 보내지 않는다. [Agent Kit #1 댓글](https://github.com/byh3071-cpu/yohan-agent-kit/issues/1#issuecomment-5390969111)의 수기·멱등 화해 경계를 따른다.
