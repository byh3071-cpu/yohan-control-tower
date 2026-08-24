# 현재 작업흐름 관제 보드

- Status: ACTIVE COORDINATION SNAPSHOT
- Updated: 2026-08-24 13:05 KST
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
| 디자인 | `codex/control-tower-design-direction` | `NOW_R3_IMPLEMENTED_VERIFIED` | Goal 15·16은 DONE이다. NOW-R3는 실제 Goal 데이터와 360·432·768·1280·1440px, 상태 5종, 키보드·대비·경로 allowlist, VHK verify 5/5를 통과했고 로컬 commit `c176c3b`에 보존됐다. | `작업`의 할 일·일정·프로젝트 형제 보기를 다음 독립 Goal로 만들 범위 확정 | 후속 Goal 승인 전 다른 네 화면·전역 탐색명·배포 수정 금지. 디자인 commit은 push하지 않음 |
| 스킬 | Yohan Agent Kit 표준 스킬 승격 | `STRUCTURE_AUDITED · WRITE_GATE_PENDING` | Agent Kit의 `skills/<name>` → manifest → registry/catalog → Codex·Cursor·Claude Code·Antigravity 배포 구조와 설치본/정본 SHA-256 일치를 확인했다. 기존 main worktree에는 사용자 변경 `goals/5`, `goals/10`이 있어 직접 수정하지 않는다. 범용 신규 후보는 `restart-safe-handoff`, `supervised-session-conductor`, `runtime-incident-investigator`이며 `design-team`·외부 `orchestration`에 백링크한다. | 별도 Agent Kit worktree 생성·Goal 활성화 후 3개 스킬, manifest, registry/catalog, fixture/검증을 구현 | 현재 저장소 밖 쓰기와 새 worktree 생성은 사람/플랫폼 게이트. 실홈 설치·벤더 호출·release·push·PR·merge·publish는 별도 게이트 |

## 2. 세션 유지·정산 판정

| 대상 | 판정 | 근거 | 허용 행동 |
| --- | --- | --- | --- |
| 현재 지휘 세션 | 유지 | Goal 13·15·16·17·18·19 DONE, VHK 2.14.0, Goal 19·policy·verify PASS. master 복구 산출물은 로컬 commit 직전 | master 로컬 commit 후 Agent Kit 별도 worktree 쓰기 게이트 상신 |
| `permit` 디자인 세션 | crash 원본으로 격리 보존 | Codex child의 512MB allocation 실패, rollout 203.75MB. 원본 rollout·thread DB·terminal history를 별도 백업 | resume·중복 지시 금지. 증거 회수에만 사용 |
| 새 디자인팀 세션 `term_5edaee34-...` | 인계 후 작업 완료 | 실제 디자인 worktree에서 Goal 15·16을 완료하고 NOW-R3 구현·QA를 `c176c3b`로 커밋 | 같은 방향을 다시 탐색하지 않고 후속 `작업` Goal 범위 승인 대기 |
| 새 메인 세션 `term_c3a2619a-...` | 인계 완료·사람 검토 대기 | HEAD `cfee44a`, dirty 37파일, Goal 14 DONE, 기존 test/build/Playwright/QA 증거와 다음 게이트 ACK | 사람 검토 전 commit·push·PR·dirty 정리 금지 |
| Yohan Agent Kit main worktree | 사용자 변경 보존 | branch `main`, `goals/5`, `goals/10` dirty | 직접 수정 금지. 신규 표준 스킬은 승인 후 별도 worktree에서만 작업 |
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
4. 범용 스킬은 Agent Kit의 기존 배포 평면에 신규 정본으로 승격하며 프로젝트 문서는 요구사항·사고 증거·포인터만 소유한다.
5. 사용자에게는 명령별 승인이 아니라 Agent Kit 별도 worktree 쓰기 한 게이트만 먼저 올린다. 실홈 설치·release·push·PR·merge·publish는 여기에 포함하지 않는다.

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
