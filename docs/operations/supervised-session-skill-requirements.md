# 감독형 멀티세션 스킬 요구사항

- Status: Draft requirements
- Owner: 상시 지휘자
- Last reviewed: 2026-08-23 (Asia/Seoul)
- Related runbook: `docs/operations/design-team-supervision-runbook.md`

## 1. 사용자가 실제로 원하는 능력

사용자가 원하는 것은 단순한 “디자인팀 스킬”이 아니다. 반복되는 요구를 기능으로 풀면 다음과 같다.

1. 전문팀에게 일을 맡기되 지휘자 한 명이 범위·상태·사람 게이트를 계속 소유한다.
2. 전문팀이 고용한 검토자·조사자의 결과까지 최종 지휘자에게 확실히 돌아온다.
3. runtime 재시작이나 terminal 종료가 있어도 결과 유실·중복 고용 없이 복구한다.
4. 작업 완료, 보고 전달, 검토 통과, 사용자 승인 상태를 구분한다.
5. 여러 보고서를 사용자가 판단할 수 있는 하나의 결정 보고로 줄인다.

이 요구를 한 스킬에 모두 넣으면 디자인 도메인과 Orca 장애 복구가 강하게 결합된다. 따라서 기존 스킬 두 개를 유지하고 신규 스킬 세 개를 조합하는 구조가 적합하다.

## 2. 권장 조합

| 층 | 스킬 | 책임 | 비책임 |
| --- | --- | --- | --- |
| 도메인 | 기존 `design-team` | DesignContext, 역할 구성, 시안, 명세, 디자인 QA, 디자인 최종 보고 | Orca runtime 복구, 전역 작업 인수 |
| 운송 | 기존 `orchestration` | Run, Task, Dispatch, inbox, `worker_done`, worker lifecycle | 산출물의 도메인 품질 판정 |
| 감독 | 신규 `supervised-session-conductor` | 역할 정합, 보고 수집, 충돌 판정, 사람 게이트 상신 | 디자인 제작, 장애 근본 원인 분석 |
| 연속성 | 신규 `restart-safe-handoff` | 이중 영수증, attempt, 재시작 재결합, 중복 실행 방지 | 작업 내용의 정답 판정 |
| 사고 대응 | 신규 `runtime-incident-investigator` | 계층 분리, timeline, 재현, 원인·가설·복구 보고 | 임의 재시작, 제품 디자인 판정 |

독립 QA는 우선 `supervised-session-conductor`가 생성하는 역할/프롬프트 템플릿으로 둔다. 디자인·코드·문서 전반에서 동일한 검토 계약이 세 번 이상 반복되면 네 번째 스킬 `evidence-review-gate`로 분리한다.

## 3. 신규 스킬 1 — `supervised-session-conductor`

### 한 줄 목적

전문팀, 독립 검토자, 장애 조사자의 일을 별도 Task로 감독하고 최종 사용자에게 하나의 근거 기반 결정 보고를 제공한다.

### Trigger

- “팀에게 맡기고 네가 최종 지휘해줘”
- “검토자/조사자를 고용하고 결과를 나에게 보고해줘”
- “여러 세션의 일을 정합해줘”
- 한 전문팀의 결과가 다른 역할의 검증을 거쳐야 하는 작업

### 필수 입력

- owner objective와 사람 게이트
- 프로젝트/worktree/branch
- 적용할 도메인 스킬
- 역할별 Scope·Non-Scope·Completion Check
- 기존 Run/Task/Dispatch 또는 `unavailable`
- 보고서 기준 경로

### 핵심 동작

1. 일을 `primary work / independent review / incident investigation / final synthesis`로 분해한다.
2. 각 역할에 단일 writer 여부와 read-only 여부를 명시한다.
3. 역할마다 프로젝트 보고서와 `worker_done`을 요구한다.
4. 보고서가 없으면 대화상 “끝났다”는 표현을 완료로 인정하지 않는다.
5. 역할 간 결론이 충돌하면 근거의 최신성·범위·독립성을 비교해 지휘자 판정을 남긴다.
6. 사용자에게는 결론, 증거, 불일치, 위험, 한 개의 사람 게이트만 보고한다.

### 출력

- task ownership matrix
- report ledger
- conflict/reconciliation note
- final decision brief
- exact next gate

### 금지

- 전문팀에 사용자 대화권 전체를 넘김
- 검토자가 원본을 직접 수정하게 함
- 보고 미수신을 성공으로 추정
- 사용자 게이트를 worker Task 완료로 대체
- 외부 실행을 사후에 Orca 작업으로 위장

### 완료 조건

- 모든 필수 역할이 `ACCEPTED` 또는 증거 있는 `BLOCKED`다.
- 충돌이 지휘자 판정으로 정리됐다.
- 사용자가 판단할 항목이 하나의 명시적 게이트로 축소됐다.

## 4. 신규 스킬 2 — `restart-safe-handoff`

### 한 줄 목적

Orca runtime·terminal·provider가 끊겨도 작업 내용을 보존하고, 전달만 복구하며, 같은 일을 중복 실행하지 않게 한다.

### Trigger

- Orca 재시작, `runtime_unavailable`, terminal exit
- worker 응답이 사라졌는데 worktree 변경은 남아 있음
- `worker_done`과 실제 보고서가 불일치
- coordinator takeover 또는 legacy assignment adoption

### 필수 입력

- `run_id`, `task_id`, `dispatch_id` 또는 unavailable 이유
- `report_id`, `attempt`
- terminal/session 상태
- worktree/branch/ref와 dirty 상태
- 보고 파일 경로

### 핵심 동작

1. 새 worker를 만들기 전에 기존 Run·terminal·worktree·보고서·Inbox를 감사한다.
2. 내용 영수증과 전달 영수증을 대조한다.
3. 보고서만 있으면 작업을 다시 하지 않고 전달만 복구한다.
4. 결과가 불명확하면 이전 attempt를 보존하고 새 attempt 번호를 발급한다.
5. original coordinator의 생존 여부를 확인한 뒤에만 takeover한다.
6. accept 후 worker release까지 생명주기를 닫는다.

### 출력

- reconciliation matrix
- recovered/delivered report receipt
- superseded attempt record
- orphaned terminal/worktree list
- safe next action

### 금지

- 장애 직후 무조건 재시작
- 살아 있는 original coordinator와 동시에 takeover
- 같은 branch에 두 writer 재고용
- DB·worktree·terminal 삭제로 상태를 “정리”
- 보고서 없이 `worker_done`만 보고 완료 인정

### 완료 조건

- 각 Task가 `accepted / running / blocked / superseded / unknown` 중 하나로 유일하게 분류된다.
- 중복 writer가 없다.
- 전달 유실과 작업 실패가 구분된다.

## 5. 신규 스킬 3 — `runtime-incident-investigator`

### 한 줄 목적

앱, 조정 runtime, terminal, provider, Git/project 명령의 실패를 분리하고 관측과 원인 주장을 증거로 연결한다.

### Trigger

- 앱은 살아 있지만 runtime API가 연결되지 않음
- terminal 재연결/종료가 섞여 있음
- provider 오류인지 Orca 오류인지 불명확
- 재시작 뒤 작업 결과가 사라지거나 중복됨

### 필수 입력

- 발생 시간대와 timezone
- Orca/app/provider version
- read-only status 결과
- 비밀값을 제거한 관련 로그 구간
- 실패 command, exit code, 재현 여부
- 작업 branch/worktree와 terminal 상태

### 조사 프레임

| 계층 | 질문 | 예시 증거 |
| --- | --- | --- |
| App | 프로세스와 UI가 살아 있는가 | process state, app log |
| Runtime | API·DB·Run 상태가 열리는가 | status, run-list, runtime log |
| Terminal | daemon과 session이 살아 있는가 | daemon log, exit code |
| Provider | Claude Code/Codex가 실제 시작·종료했는가 | provider receipt, terminal output |
| Project | Git/worktree/command가 실패했는가 | command trace, ref, diff |

### 출력

- 짧은 incident summary
- timezone이 있는 timeline
- 관측 사실 목록
- 순위화된 원인 가설과 확신도
- 각 가설의 지지·반증 증거
- root cause 또는 `not established`
- 데이터 손실·중복 실행 영향
- 안전 복구와 재발 방지 제안

### 금지

- 상관관계를 인과관계로 표기
- 토큰·credential·auth 파일 열람 또는 보고서 포함
- 조사 중 상태를 바꾸는 restart/kill/DB repair
- 재현 없이 특정 provider를 원인으로 지목
- “오류가 났다”만 적고 계층·영향·다음 관측점을 생략

### 완료 조건

- 모든 주장에 evidence 또는 `[추론]` 표지가 있다.
- 확정 원인이 없으면 반증 가능한 다음 관측점이 있다.
- 복구 조치와 근본 수정 제안이 분리된다.

## 6. 조건부 스킬 — `evidence-review-gate`

현재는 별도 스킬보다 감독 스킬의 역할 템플릿이 적절하다. 다음 조건이 생기면 분리한다.

- 디자인, 코드, 문서 QA에서 동일한 report schema가 반복된다.
- 고의 오류 fixture와 severity 판정 규칙을 공통으로 재사용한다.
- Claude Code, Codex 등 provider가 바뀌어도 같은 독립성 계약이 필요하다.

분리 시 책임은 “주장과 증거를 적대적으로 검토해 P0/P1/P2 보고서를 남기는 것”으로 제한한다. 수정·승인·merge는 책임에 넣지 않는다.

## 7. 스킬 간 호출 순서

```text
supervised-session-conductor
├─ design-team                  # 도메인 작업
├─ evidence-review role        # 독립 QA
├─ runtime-incident-investigator  # 장애가 있을 때만
├─ restart-safe-handoff        # 전달/재시작 이상이 있을 때
└─ orchestration               # 실제 Run/Task/Dispatch 운송
```

`supervised-session-conductor`는 결과를 조합하지만 하위 스킬의 전문 판정을 덮어쓰지 않는다. `restart-safe-handoff`는 내용 품질을 평가하지 않고, `runtime-incident-investigator`는 상태를 바꾸지 않는다.

## 8. 최소 skill acceptance test

### 감독 스킬

- 디자인 완료, 독립 QA 미수신, 장애 조사 partial인 fixture에서 전체를 완료로 판정하지 않는다.
- QA와 디자인팀 결론이 충돌하면 양쪽 ref를 보존하고 사람 게이트로 올린다.
- 최종 보고가 역할별 채팅 나열이 아니라 하나의 결정 보고가 된다.

### 연속성 스킬

- 보고서는 있고 `worker_done`이 없는 fixture에서 재실행 대신 전달 복구를 선택한다.
- `worker_done`만 있고 보고서가 없는 fixture를 완료로 거절한다.
- 살아 있는 original coordinator가 있으면 takeover를 차단한다.

### 장애 조사 스킬

- `spawn git ENOENT`와 runtime 불가가 같은 시간에 발생해도 인과를 자동 확정하지 않는다.
- Git이 다른 호출에서 성공한 증거를 반증 항목으로 포함한다.
- auth·credential 경로는 열지 않고도 진단 보고서를 완성한다.

## 9. 구현 우선순위

1. `restart-safe-handoff` — 현재 발생한 전달 유실 위험을 직접 줄인다.
2. `supervised-session-conductor` — 디자인팀·QA·조사자 결과를 한 흐름으로 묶는다.
3. `runtime-incident-investigator` — 장애 조사 품질과 재현성을 표준화한다.
4. `evidence-review-gate` — 반복 사용 증거가 쌓인 뒤 분리한다.

첫 버전은 Orca 전용 명령을 스킬 본문에 복제하지 말고 기존 `orchestration`·`orca-cli`를 호출해야 한다. 범용 계약은 스킬이, 버전별 명령은 Orca의 live skill guide가 소유한다.
