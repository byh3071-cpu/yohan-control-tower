# 디자인팀 감독·검토·장애조사 운영 매뉴얼

- Status: Proposed — 운영 적용 전 사용자 확인 대기
- Owner: 상시 지휘자
- Applies to: 디자인팀, 독립 QA 검토자, 런타임 장애 조사자
- Last reviewed: 2026-08-23 (Asia/Seoul)
- Related Goal: `goals/16-design-team-supervision-protocol.md`

## 1. 운영 목표

이 매뉴얼은 다음 네 가지를 동시에 만족시키기 위한 계약이다.

1. 사용자는 디자인팀과 여러 검토자를 각각 추적하지 않고 지휘자에게서 한 번에 보고받는다.
2. 디자인팀, 독립 검토자, 장애 조사자는 서로의 결론을 대신하지 않고 증거가 있는 독립 산출물을 남긴다.
3. Orca 런타임이 재시작되거나 전달 이벤트가 유실돼도 프로젝트 소유 보고서에서 작업을 복구한다.
4. 디자인 완료, QA 완료, 보고 전달, 사용자 승인이라는 서로 다른 상태를 하나의 `완료`로 뭉개지 않는다.

운영 흐름은 아래와 같다.

`지휘자 → Run/Task/Dispatch → 역할자 작업 → 프로젝트 보고서 → worker_done → 지휘자 검증 → 사용자 게이트`

프로젝트 보고서는 작업의 내용 영수증이고, `worker_done`은 전달 영수증이다. 둘 중 하나만 있으면 인수 완료가 아니다.

## 2. 현재 인수 상태

2026-08-23 13시대의 로컬 증거를 기준으로 한 스냅샷이다. 대화상 지시와 실제 인수 완료를 구분한다.

| 작업 | 관측된 상태 | 지휘자 판정 | 다음 소유자 |
| --- | --- | --- | --- |
| 디자인 방향·자산 상세 프로토타입 | `codex/control-tower-design-direction`에 디자인 커밋과 QA 영수증이 있다. 반응형·키보드·콘솔 등 기술 게이트는 통과했다. | 부분 완료 | 디자인팀 |
| 실제 사용자 과제 QA | 5개 과제의 시간·오답·복구는 `not run`이다. 고의 오류 대조본의 사람 거절도 미실행이다. | 미완료 | 사용자 + 디자인팀 진행자 |
| 디자인 최종 보고 | 선택·제안·미검증·잔존 위험을 합친 별도 최종 인수 보고서는 발견되지 않았다. 일부 계약 문서는 아직 미추적 상태다. | 미수신 | 디자인팀 |
| Claude Code 독립 문서 검토 | 검토용 작업공간은 있으나 새 보고서·diff·완료 영수증이 발견되지 않았다. | 미수신 | 독립 검토자 |
| Orca 장애 조사 | 지휘자가 확인한 런타임 증거는 있으나 조사자가 작성한 원인 보고서는 발견되지 않았다. | 미수신 | 장애 조사자 |
| Orca 조정 채널 | 앱 프로세스는 실행 중이다. runtime은 잠시 `ready`를 반환했지만 직후 Run·Task·Inbox·Terminal 조회가 모두 `runtime_unavailable`이 됐고, 13:23 KST에 다시 `starting`, `reachable: false`로 관측됐다. | 불안정·조정 중단 | 지휘자 |

따라서 현재 전체 상태는 `BLOCKED: 보고 인수 불완전 + 조정 런타임 불가`다. 디자인 결과가 사라졌다는 뜻은 아니며, 제품 적용을 승인할 증거 묶음이 아직 완성되지 않았다는 뜻이다.

### 현재 장애에 대해 말할 수 있는 것

**관측 사실**

- Orca UI 프로세스와 terminal daemon은 살아 있다.
- 재시작 뒤 일부 기존 terminal session은 다시 연결됐다.
- 디자인 worktree terminal은 이후 exit code 1로 종료됐다.
- 같은 시간대 graph/worktree refresh에서 `spawn git ENOENT`가 반복됐다.
- 현재 셸에서는 Git 실행 파일을 정상 해석하며, 실패 사이에 성공한 Git 호출도 있었다.
- 조정 runtime은 일시적으로 `ready`를 반환했으나 실제 조회 네 건이 곧바로 모두 실패했다. 현재 API 연결은 안정적으로 사용할 수 없다.

**원인 가설**

- [추론, 확신 중간] Orca의 graph/worktree 탐색 프로세스가 재시작 시점의 실행 환경 또는 PATH를 간헐적으로 잃었고 runtime 기동을 방해했을 가능성이 있다.
- [추론, 확신 낮음~중간] 디자인 terminal의 exit code 1은 조정 runtime 불가와 같은 상위 장애의 결과일 수도 있고 별개의 작업 실패일 수도 있다.
- [추론, 확신 낮음] Claude Code 검토 작업이 Orca 재시작의 직접 원인이라는 증거는 현재 없다.

**아직 모르는 것**

- 최초 재시작을 촉발한 이벤트와 정확한 시각
- `spawn git ENOENT`와 runtime 불가 사이의 인과관계
- 독립 검토자와 조사자가 보고서 작성 직전이었는지, 작업 자체를 시작하지 못했는지
- Orca DB에 Dispatch·Inbox 상태가 어느 지점까지 영속화됐는지

근본 원인은 조사 보고서가 재현 절차와 반증 증거를 갖추기 전까지 `미확정`으로 유지한다.

## 3. 방향성 정합

### 제품 방향

- 첫 화면은 capture-first가 아니라 **결정 우선 `지금` 화면**이다. “무엇을 이어가고, 무엇을 승인하고, 어디가 막혔는가”에 답한다.
- 상위 탐색은 다섯 개 이하를 유지한다. 기능을 더할 때는 기존 영역 아래로 합친다.
- 목록에서 선택한 항목은 화면마다 다른 drawer를 만들지 않고 공통 **관계형 검사 열**에서 연다.
- 3안의 구조와 시각 밀도를 기본으로 하고, 2안의 문서 근거·관계 표현을 결합한다.
- `지원`, `설치`, `연결`, `검증`은 서로 다른 상태다. 하나를 다른 하나로 추론해 표시하지 않는다.

### 디자인팀 산출물의 위치

현재 자산 상세 프로토타입은 위 제품 방향을 대체하는 새 Home이 아니다. 공통 검사 열과 `스킬·도구` 화면의 정보 계약을 검증하는 **하위 surface 후보**다. 따라서 다음 순서로만 승격한다.

1. 디자인팀이 미추적 계약 문서와 최종 보고서를 Git에 보존한다.
2. 사용자가 설명 없이 5개 과제를 수행하고 오답·시간을 기록한다.
3. 독립 검토자가 계약, QA 수치, 고의 오류 대조본을 검토한다.
4. 지휘자가 main의 결정 우선 Home·공통 shell과 충돌 여부를 정리한다.
5. 사용자가 시각·구조를 승인한 뒤에만 production handoff를 만든다.

### 지금 합치면 안 되는 것

- 디자인 branch의 Goal 15는 `요한 관제탑 디자인 방향 선택과 기술 명세`이고 main의 Goal 15는 `VHK 정책 기준선`이다. merge 전에 Goal ID를 재부여해야 한다.
- 디자인 branch의 Goal 13 상태는 main의 완료 상태보다 오래됐다. 상태 파일을 그대로 덮어쓰지 않는다.
- 실제 사용자 과제 결과가 없는 기술 QA를 제품 적합성 승인으로 승격하지 않는다.
- prototype-only 원격 브랜드 SVG를 로컬 production 자산으로 간주하지 않는다.

## 4. 역할과 책임

| 역할 | 결정 권한 | 필수 입력 | 필수 출력 | 완료 조건 |
| --- | --- | --- | --- | --- |
| 사용자 | 방향·취향·최종 채택·상태 변경 승인 | 지휘자의 통합 결정 보고 | 승인·수정·거절 중 하나 | 명시적 사람 판정 |
| 상시 지휘자 | 범위 분해, 역할 배치, 인수 판정, 사용자 게이트 상신 | 프로젝트 규칙, active Goal, 각 역할 보고서 | 통합 상태표, 충돌 정리, 정확한 다음 게이트 | 모든 필수 보고서를 검증하고 사용자에게 한 번에 보고 |
| 디자인팀 | 조사·시안·명세·기술 QA, 최종 디자인 보고 | DesignContext, 결정 로그, 사용자 피드백 | 디자인 산출물, QA 영수증, 최종 보고 | 승인/제안/미검증을 분리하고 모든 산출물을 Git ref로 고정 |
| 독립 QA 검토자 | 산출물의 오류·누락·허위 통과를 적대 검토 | 고정된 review packet | read-only 검토 보고서 | 각 결함에 근거·심각도·재현·권고가 있고 P0/P1 판정 명시 |
| 장애 조사자 | 장애 계층 분리, 재현, 원인 가설 검증 | version, timeline, status, 비밀값 제거 로그 | incident report | 관측·가설·반증·확정 원인·안전 복구를 분리 |

한 역할이 다른 역할의 판정을 대신할 수 없다. 디자인팀 자체 QA는 독립 QA가 아니며, 장애 조사자는 디자인 채택을 결정하지 않는다.

## 5. 보고 계약

### 보고 상태 기계

| 상태 | 의미 | 다음 상태 조건 |
| --- | --- | --- |
| `REQUESTED` | Task와 범위가 정해짐 | 실제 실행 시작 |
| `RUNNING` | 역할자가 작업 중 | 보고 파일 작성 또는 명시적 차단 |
| `EVIDENCE_WRITTEN` | 프로젝트 소유 보고서가 저장됨 | Orca 전달 영수증 발행 |
| `DELIVERED` | 해당 Dispatch의 `worker_done` 수신 | 지휘자 내용 검증 |
| `ACCEPTED` | 지휘자가 산출물과 영수증을 대조함 | 다음 사람/작업 게이트 |
| `BLOCKED` | 증거를 갖춘 차단 보고 | 지휘자의 복구·재배치 결정 |

`terminal exited`, `응답 없음`, `파일이 있음`, `worker_done 수신`은 각각 단독으로 `ACCEPTED`가 아니다.

### 이중 영수증

1. **내용 영수증** — 작업 branch 안의 `docs/operations/reports/YYYY-MM-DD/<report-id>.md`
2. **전달 영수증** — 같은 Task·Dispatch에 연결된 Orca `worker_done`

Orca가 내려가 있으면 먼저 내용 영수증을 안전하게 남기고, `delivery: pending-runtime`으로 표시한다. runtime 복구 후 같은 `report_id`로 정확히 한 번 전달한다. 새 보고서를 다시 만들지 않는다.

### 공통 보고서 머리말

```yaml
report_id: <date>-<workstream>-<attempt>
report_type: design-final | independent-review | runtime-incident
task_id: <orca task id or unavailable>
dispatch_id: <orca dispatch id or unavailable>
attempt: 1
status: complete | blocked | partial
owner_role: design-conductor | independent-reviewer | incident-investigator
branch: <branch>
git_ref: <commit or dirty-worktree>
delivery: delivered | pending-runtime
created_at: <ISO 8601 with timezone>
```

본문에는 반드시 다음을 넣는다.

- 맡은 범위와 Non-Scope
- 관측 사실, 추론, 제안의 구분
- 생성·수정한 산출물과 Git ref
- 실행한 검증, 실제 측정값, pass/fail/not run
- 남은 P0/P1/P2와 불확실성
- provider receipt: 역할, runtime/provider/model, 사용 tool/skill, 대체 여부
- 지휘자가 바로 실행할 수 있는 정확한 다음 행동 한 개

## 6. 정상 운영 절차

### A. 지휘자가 일을 열 때

1. `.vhk/HARD_STOP`, active Goal, dirty worktree, 기존 Dispatch를 확인한다.
2. 한 작업에 한 writer만 지정한다. 검토자와 조사자는 원칙적으로 read-only다.
3. Orca에서는 반드시 `Run → Task → Dispatch` 순서로 만들고 Task별 보고서 경로와 완료 조건을 프롬프트에 넣는다.
4. 디자인, QA, 장애조사를 서로 다른 Task로 만든다. 하나의 `최종 보고` Task가 다른 Task의 증거를 모아 지휘자에게 전달한다.
5. 사용자 하드게이트를 Task 완료와 분리한다.

### B. 디자인팀이 끝낼 때

1. DesignContext와 결정 로그를 현재 ref로 갱신한다.
2. `Approved / Proposed / Rejected / Stale`를 분리한다.
3. 기술 QA와 실제 사용자 QA를 별도 표로 기록한다.
4. 미추적 계약·증거를 보존하지 못했으면 `partial` 또는 `blocked`로 보고한다.
5. 최종 보고서를 쓴 뒤 같은 `report_id`를 `worker_done`에 넣는다.

### C. 독립 검토자를 고용할 때

검토 packet을 고정하지 않고 “현재 문서 좀 봐줘”라고 요청하지 않는다. 다음을 함께 준다.

- review 대상 파일과 Git ref
- 제품 목표와 Non-Scope
- Completion Check와 주장된 통과 항목
- 고의 오류 대조본 또는 대표 failure fixture
- 원하는 산출물 경로
- read-only, no fix, no merge 조건

검토자는 `판정 → 근거 → 재현 → 영향 → 권고` 순으로 쓴다. 수정은 지휘자가 별도 Task로 연다.

### D. 장애 조사자를 고용할 때

조사자는 먼저 실패 계층을 분리한다.

1. Orca app process
2. orchestration runtime/DB/API
3. terminal daemon/session
4. provider CLI 또는 모델 실행
5. Git/worktree/project command

각 계층마다 `Expected / Observed / Evidence / Verdict`를 기록한다. 시간 상관만으로 인과를 확정하지 않으며, 재현되지 않으면 가장 강한 가설과 반증 조건을 함께 남긴다.

## 7. Orca 재시작·전달 유실 복구

### 즉시 정지선

- 같은 역할자를 다시 Dispatch하지 않는다.
- 추가 Orca 재시작, 강제 종료, DB 수정, worktree 삭제를 하지 않는다.
- 살아 있는 original coordinator가 있는지 먼저 확인한다.

### 복구 순서

1. 시각, Orca version, app/runtime/daemon 상태를 비밀값 없이 캡처한다.
2. runtime이 연결되면 기존 Run·Task·Dispatch·Inbox부터 조회한다.
3. legacy assignment가 adopt됐다면 original coordinator의 생존 여부를 확인한 뒤에만 takeover한다.
4. terminal, worktree diff, 보고 파일, `worker_done` 네 가지를 Task별로 대조한다.
5. 아래 판정표로 복구한다.

| 내용 보고서 | worker_done | terminal | 판정 | 조치 |
| --- | --- | --- | --- | --- |
| 있음 | 있음 | 임의 | 전달 후보 | ref·검증을 확인한 뒤 accept |
| 있음 | 없음 | 종료 | 전달 유실 | 작업을 재실행하지 말고 같은 `report_id`로 전달만 복구 |
| 없음 | 있음 | 임의 | 허위/불완전 전달 | complete 인정 금지, 보고서 보완 요청 |
| 없음 | 없음 | 살아 있음 | 실행 중/고립 | 중단시키지 말고 상태 질문 또는 제한 시간 대기 |
| 없음 | 없음 | 종료 | 결과 불명 | diff·terminal 기록 조사 후 새 attempt 결정 |

6. 재실행이 필요하면 같은 `report_id`를 재사용하지 않고 `attempt`를 올린다. 이전 attempt는 `superseded`로 보존한다.
7. 지휘자가 결과를 accept한 뒤에만 worker를 release한다.

## 8. 현재 각자의 할 일

### 지휘자

- 이 매뉴얼과 스킬 요구사항을 기준선으로 유지한다.
- Orca를 섣불리 재시작하지 않고 조사 보고서를 기다리거나 runtime 복구 뒤 기존 Run을 먼저 감사한다.
- 디자인 최종 보고, 독립 QA 보고, 장애 조사 보고를 별도 인수한다.
- design branch의 Goal ID·상태 충돌과 미추적 산출물을 해결하기 전 production handoff를 차단한다.
- 세 보고를 사용자용 한 장의 결정 보고로 줄인다.

### 디자인팀

- 현재 시안을 `candidate A`로 유지하고 제품 승인으로 표현하지 않는다.
- 미추적 `asset-detail-contract.md`, `visual-hierarchy-contract.md`와 수정된 컨텍스트·결정 문서를 보존한다.
- 실제 사용자 5개 과제의 진행 스크립트와 기록표를 준비하되 사용자 결과를 대신 만들지 않는다.
- 디자인 최종 보고서를 공통 계약으로 남긴다.

### 독립 QA 검토자

- 고정된 design ref와 QA 영수증을 read-only로 검토한다.
- `not run`을 pass로 오인한 곳, 상태 축 혼합, 근거 없는 제품 적합성 주장을 우선 공격한다.
- 별도 독립 검토 보고서를 남긴다.

### 장애 조사자

- 위 다섯 실패 계층을 분리하고 정확한 timeline을 만든다.
- `spawn git ENOENT`, 디자인 terminal exit, runtime 불가의 인과관계를 각각 검증한다.
- 재현되지 않으면 확정 원인 대신 순위화된 가설과 다음 관측점을 보고한다.

### 사용자

- 디자인팀이 준비한 5개 과제를 설명 없이 수행하고 결과 기록을 허용한다.
- 지휘자의 통합 보고에서 디자인 `승인 / 수정 / 거절`을 결정한다.
- Orca 추가 재시작·상태 복구처럼 실행 중 세션에 영향을 줄 조치는 별도 사람 게이트로 결정한다.

## 9. 지휘자 최종 보고 형식

지휘자는 사용자에게 역할별 원문을 그대로 던지지 않는다. 다음 다섯 항목으로 통합한다.

1. **결론** — 지금 채택 가능한 것과 차단된 것
2. **증거** — 디자인, QA, 장애조사 보고서 ref
3. **불일치** — 역할 간 충돌과 지휘자 판정
4. **위험** — P0/P1, 미검증, 원인 미확정
5. **사람 게이트** — 사용자가 지금 결정할 한 가지

보고서가 도착하지 않았으면 추측으로 채우지 않고 `미수신`이라고 적는다.

## 10. 운영 성공 기준

- 모든 Task에 단일 writer, 보고서 경로, Dispatch, Completion Check가 있다.
- runtime 재시작 뒤에도 기존 보고서를 찾아 중복 실행 없이 인수할 수 있다.
- 디자인 기술 QA와 사용자 제품 QA가 분리된다.
- 독립 검토와 장애 조사 결론이 지휘자에게 별도 증거로 도착한다.
- 사용자는 마지막에 하나의 통합 결정만 내린다.
