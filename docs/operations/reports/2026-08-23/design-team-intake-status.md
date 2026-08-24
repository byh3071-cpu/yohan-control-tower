---
report_id: 2026-08-23-design-team-intake-1
report_type: conductor-intake
task_id: unavailable-runtime
dispatch_id: unavailable-runtime
attempt: 1
status: partial
owner_role: conductor
branch: master
git_ref: dirty-worktree@cf61612
delivery: pending-runtime
created_at: 2026-08-23T13:47:17+09:00
---

# 디자인팀·QA·장애조사 인수 상태

## 결론

현재 채택 가능한 것은 **자산 상세 surface의 구조 후보와 일부 기술 QA 증거**까지다. 독립 QA는 Orca Task result에서 회수됐으며 최종 판정은 `BLOCKED — P0 1건, P1 6건`이다. 디자인 최종 승인, 실제 사용자 과제 통과, 독립 QA 통과는 아직 아니다. 따라서 candidate A는 공통 관계형 검사 열의 하위 surface 후보로 유지하고 production handoff는 차단한다.

## 역할별 인수표

| 역할·산출물 | 증거 | 인수 판정 | 누락·위험 | 다음 소유자 |
| --- | --- | --- | --- | --- |
| 디자인 방향·자산 상세 후보 | 디자인 ref `4688b826`에 QA 영수증이 있고 이후 설계 문서 6개가 수정, 계약 문서 2개가 미추적 상태 | **부분 수신** | dirty 상태라 최종 ref가 아니며 최종 보고 없음 | 디자인팀 |
| 기술 QA | 360~1440px overflow, 키보드, 콘솔, 대비 항목이 pass로 기록 | **수신** | prototype-only 원격 자산과 실제 보조기술 조합은 별도 위험 | 디자인팀 |
| 실제 사용자 5개 과제 | 정답률·시간·용어 이해·오답 복구가 모두 `not run` | **미수행** | 제품 적합성 승인 불가 | 사용자 + 디자인팀 진행자 |
| 디자인 최종 보고 | 별도 `design-final` 보고서를 발견하지 못함 | **미수신** | 승인·제안·미검증·잔존 위험을 한 ref로 인수할 수 없음 | 디자인팀 |
| Claude Code 독립 문서 검토 | Task `task_1d9a49c4101b`가 completed이고 worker report가 `BLOCKED — P0 1건, P1 6건`으로 저장됨. target worktree 무수정은 read-only 계약과 일치 | **수신 · BLOCKED** | reportPath가 없고 Playwright 부산물 2개가 target worktree에 생성됨 | 디자인팀 + 독립 검토자 |
| 고용된 장애 조사자 | Task `task_b05f1536d483`은 dispatched 상태지만 Dispatch `ctx_0cec168cfa58`은 failed. effective agent·model·effort가 모두 null이고 재사용 terminal은 `stop_unverified`로 종료 | **실패 · 미수신** | provider 실행·heartbeat·보고서가 없음 | 장애 조사 소유자 |
| 지휘자 대체 장애 조사 | `orca-runtime-incident.md`에 신원별 A/B 진단, 실패 계층, 복구 게이트 기록 | **부분 수신** | 앱 재시작 원인과 Git 오류 인과는 미확정 | 지휘자 |
| Orca 전달 영수증 | sandbox 안 RPC는 실패했지만 같은 runtime ID에 sandbox 밖 read-only RPC가 성공해 Task result를 회수 | **부분 수신** | 기본 Codex sandbox에서는 계속 전달·조회 불가 | 지휘자 |

`terminal이 살아 있음`, `exit code 1`, `worktree가 존재함`은 각각 단독 완료 증거가 아니다. 반대로 엄격 read-only 검토는 target worktree에 파일이 없어도 Task result의 유효한 `worker_done`으로 완료될 수 있다. 이 경우 지휘자가 payload를 프로젝트 소유 보고서에 즉시 물질화해야 이중 영수증 계약이 완성된다. 이번 독립 QA는 내용은 회수됐지만 별도 reportPath가 없어 인수 품질은 부분적이다.

## 회수한 독립 QA 판정

### P0 1건

- 1279px 이하에서 열린 상세 modal이 상단의 `의도적으로 잘못된 대조본` 경고를 시각적으로 가리고, topbar를 `aria-hidden` 처리한다. 그 상태에서도 조작된 `설치됨` 항목은 렌더된다. 따라서 QA 영수증의 경고 `지속 표시`와 `잔존 P0/P1 없음` 주장은 반증됐다.

### P1 6건

1. 1440px 목록에서 Enter 선택 시 상세 갱신 과정에서 focus가 `body`로 유실된다.
2. 본문·선택 항목·section의 실제 타입스케일이 시각 계약과 다르다.
3. Windows 한글 폰트 실측 없이 computed px만으로 가독성을 pass 처리했다.
4. 공통 머리말 필수항목인 관리주체·출처·검증결과가 기본 접힘 근거로 강등됐다.
5. 선언한 4개 상태축 중 `release-inclusion`이 목록과 상세에 없다.
6. 미추적 계약 문서 2개를 정본 출처로 인용해 dangling reference가 생겼다.

모달 focus trap·inert·세 종료 경로·breakpoint 전환·복귀 focus·5개 viewport overflow·console·대비·5탭 상한은 독립 재현에서 통과했다. 따라서 전체 실패가 아니라 **좋은 기반 위의 출고 차단 결함**으로 본다.

### 검토 절차 위반

검토 Task는 파일 생성도 금지했지만 Playwright MCP가 `.playwright-mcp/` 아래 snapshot 2개를 만들었다. worker가 삭제를 시도했으나 권한 거부로 남았다. 이 파일은 사용자 승인 없는 삭제 대상이 아니며, 향후 read-only browser 검토는 target worktree 밖 격리 출력 또는 file-producing 기능 비활성화를 Completion Check에 넣어야 한다.

## 현재 제품 방향과의 정합

- Home은 결정 우선 `지금` 화면을 유지한다. 무엇을 이어가고, 무엇을 승인하며, 어디가 막혔는지 한 화면에서 답한다.
- 상위 탐색은 5개 이하를 유지한다.
- candidate A의 자산 상세는 새 Home이 아니라 목록 선택 시 열리는 공통 관계형 검사 열 또는 `스킬·도구` 하위 surface 후보로 본다.
- `지원 환경`, `현재 PC 설치`, `연결`, `검증`은 별도 상태 축으로 표시한다.
- 실제 사용자 5개 과제와 독립 검토가 끝나기 전 시각 후보를 production 정보 구조로 승격하지 않는다.

## 인수 순서

1. 디자인팀이 P0 1건·P1 6건을 수정하고, 미추적 계약 문서와 수정된 QA 주장을 하나의 고정 Git ref로 보존한다.
2. 디자인팀이 `Approved / Proposed / Rejected / Stale`과 기술 QA·사용자 QA를 분리한 `design-final` 보고서를 남긴다.
3. 사용자가 설명 없이 5개 과제를 수행하고 시간·오답·복구를 기록한다.
4. 독립 QA 검토자가 수정 ref와 QA 영수증을 file-producing 부산물 없이 재검토한다.
5. 지휘자가 main의 결정 우선 Home·5탭 상한·공통 shell과 충돌을 정리한다.
6. 사용자가 `승인 / 수정 / 거절` 중 하나를 결정한 뒤에만 production handoff를 연다.

## 가장 강한 채택 논리와 반대 논리

**채택 논리:** 독립 QA에서도 modal focus trap·반응형·overflow·console·대비·5탭 상한이 통과했고, 상태 축을 분리한 자산 상세 구조는 현재 관제탑의 공통 검사 열 방향과 잘 맞는다.

**반대 논리:** 안전 경고가 modal 아래에 가려지는 P0와 focus·계약·상태축·근거의 P1 6건이 확인됐고, 사용성 핵심인 5개 실제 과제는 전부 미측정이며 최종 설계 문서도 dirty다. 이 상태에서 채택하면 일부 기술적 통과를 제품 이해 가능성과 안전성으로 잘못 대체한다.

지휘자 판정은 **구조 후보 유지, production 승격 보류**다. [확신 높음]

## Provider receipt

- 작성 역할: 상시 지휘자
- 사용 증거: 디자인 QA 영수증, 세 worktree Git 상태, Orca Task·Dispatch result, 신원별 실제 RPC, Goal 16 운영 계약
- 독립 검토 대체 여부: 대체하지 않음
- 정확한 다음 행동: **디자인팀이 회수된 P0 1건·P1 6건을 수정하고 dirty 계약·QA 문서와 `design-final`을 하나의 고정 Git ref로 제출한다.**
