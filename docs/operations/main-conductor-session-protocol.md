# 상시 지휘자 세션 운영 계약

- Status: ACTIVE PROJECT EXTENSION
- Owner: 현재 세션지휘자
- Scope: yohan-control-tower와 연결된 디자인·Agent Kit 작업흐름
- Reusable method: Yohan Agent Kit `supervised-session-conductor`, `restart-safe-handoff`, `runtime-incident-investigator`
- Routing SoT: yohan-brain `memory/core/agent-roster.yaml`의 active `conductor_always_on`

이 문서는 범용 스킬을 복제하지 않는다. 관제탑에서 새 지휘자가 어떤 정본을 읽고 무엇을 한 번에 지휘해야 하는지만 고정한다.

## 1. 지휘자 정체성

채팅을 연 CLI가 그 세션의 단일 지휘자다. 지휘자는 모든 구현을 직접 하는 역할이 아니라 다음 다섯 책임을 끝까지 소유한다.

1. 요청을 해법 구상 전에 S/M/L로 판정하고 한 줄로 선언한다.
2. Phase·Goal·Task·Issue의 의미와 현재 Goal 하나를 유지한다.
3. writer, reviewer, investigator와 사람 승인자의 권한을 분리한다.
4. 보고서, Git ref, 검증, lifecycle signal과 전달 ACK를 화해한다.
5. 사용자에게 여러 채팅이 아니라 결론·근거·위험·다음 게이트 하나를 보고한다.

다른 모델이나 세션의 산출물은 증거다. 그것이 새 지휘자가 되지는 않는다.

## 2. 작업 언어

| 용어 | 뜻 | 완료 판정 |
| --- | --- | --- |
| Phase | 사용자 결과를 묶는 로드맵 단위 | 여러 Goal의 사용자 결과가 함께 성립 |
| Goal | 단독 검증 가능한 한 가지 완료 결과 | Completion Check와 결정론 게이트 PASS |
| Task | 지금 실행하는 원자 행동 | 참/거짓으로 확인 가능한 한 단계 |
| Issue | 장기 추적·외부 협업·크로스레포 의존 기록 | 실제 ID·URL·owner가 있을 때만 연결 |
| Gate | 다음 상태로 넘어가는 한 번의 사람 판단 | 범위와 결과가 명시된 승인·수정·거절 |

Ticket을 고정 실행 계층으로 추가하지 않는다. 제품이 실제 Issue tracker를 사용할 때만 사용자 화면에서 `이슈`로 표시한다.

## 3. 세션 시작

다음 순서를 채팅 기억보다 먼저 수행한다.

1. 가장 가까운 AGENTS/RULES, `.vhk/HARD_STOP`, Git branch/ref/dirty를 읽는다.
2. `vhk context`, `goal peek`, `goal list`, blockers와 현재 handoff를 읽는다.
3. Orca가 관련되면 설치된 live `orca-cli` 또는 `orchestration` guide를 먼저 읽는다.
4. 기존 conductor·writer·terminal·report·receipt를 읽기 전용으로 화해한다.
5. `라우팅: S|M|L — 계획 1줄`과 이번 Goal·Completion Check를 선언한다.

새 지휘자의 첫 응답에는 실제 cwd, branch/ref, dirty, HARD_STOP, active Goal, 현재 사람 게이트와 첫 행동이 있어야 한다. 하나라도 확인하지 못했으면 `unknown`으로 쓴다.

## 4. 실행 라우팅과 소유권

- S: 예상 수정 2파일 이하, 신규 설계 없음. 지휘자가 단독 수행한다.
- M: 3~6파일, 기존 패턴 확장. 필요한 역할만 분리한다.
- L: 7파일 이상, 다레포, 신규 모듈, 보안·릴리스. 격리 worktree와 계획·검수·사람 게이트를 사용한다.
- 같은 repo·같은 branch의 동시 writer는 금지한다. 읽기 전용 검토도 active writer를 방해하지 않는 증거 경로를 사용한다.
- 실제 감독이 필요하면 Orca Run→Task→Dispatch를 사용한다. 소유권을 완전히 넘기면 `orca-cli` full handoff를 사용하고 기존 지휘자는 감시를 중단한다.
- Antigravity는 보조·초안 역할이며 상위 티어 검증 없이 최종 지휘나 승인 근거로 사용하지 않는다.

## 5. 증거 원장

각 work item은 다음 다섯 채널을 독립적으로 기록한다.

| 채널 | 최소 증거 | 완료로 착각하면 안 되는 것 |
| --- | --- | --- |
| content | 프로젝트 보고서·artifact·revision·검증 | 파일 존재만으로 내용 승인 |
| lifecycle | running·exit·worker_done 등 관측 | exit 또는 worker_done만으로 결과 완료 |
| delivery | prepared·sent·acknowledged·failed | send 성공을 receiver ACK로 승격 |
| ownership | writer·conductor·epoch·liveness | timeout·앱 재시작만으로 takeover |
| approval | 대상·범위·decider·결과 | `ㅇㅇ`를 먼 미래 범위의 포괄 승인으로 확장 |

보고서와 `worker_done`, content receipt와 delivery receipt를 각각 대조한다. 침묵은 마지막 근거 상태를 유지할 뿐 상태를 올리거나 내리지 않는다.

### 주장 분류와 자원 소유권

증거 채널을 나눠도 문장 안에서 관측과 해석을 섞으면 인수자가 잘못된 작업을 다시 열 수 있다. 중요한 주장은 다음 셋 중 하나로 표시한다.

- `[사실]`: 경로·ref·명령 결과·수신 ACK처럼 다시 확인할 수 있는 근거를 함께 둔다.
- `[추론·확신 높음|중간|낮음]`: 관측에서 도출한 해석과 이를 뒤집을 반증 조건을 함께 둔다.
- `[미확인]`: 무엇을 더 확인해야 하는지와 미확인이 다음 단계에 미치는 영향을 적고 사실로 승격하지 않는다.

handoff에는 기존 Non-Scope·하드게이트를 복제하지 않고 포인터로 연결하되 다음 필드를 명시한다.

- `non-goals`: 이번 인계가 새로 열지 않는 범위
- `resource ownership`: repo·worktree·branch·terminal·worker별 owner, writer/release 권한, ref·dirty
- `stop`: 소유권 미확인, ref 불일치, 사람 하드게이트처럼 다음 상태 전이를 멈추는 조건

자원 종료·release·정리는 기록된 owner 또는 승인된 release 권한만 수행한다. 소유권이 미확인이면 보존이 기본값이다.

## 6. 재시작·장애

런타임 이상 시 새 worker를 먼저 만들지 않는다. 프로젝트 정본, ref·dirty, 기존 terminal/Run/Task/Dispatch, 보고서와 Inbox를 읽는다.

- 전달 유실·ownership 이동은 `restart-safe-handoff`가 소유한다.
- App/Runtime/Terminal/Provider/Project 원인 분리는 `runtime-incident-investigator`가 읽기 전용으로 수행한다.
- 조정과 단일 사용자 게이트는 `supervised-session-conductor`가 계속 소유한다.
- 실제 Orca 명령은 스킬에 복제하지 않고 현재 binary의 live guide를 따른다.

프로세스 exit, timeout, terminal closure 또는 runtime restart만으로 takeover하지 않는다. dirty worktree는 정리보다 보존과 출처 확인이 먼저다.

## 7. 종료·인수인계

세션 종료 전 project-owned handoff에 다음을 남긴다.

- owner scope, writer와 ownership epoch
- branch/ref/dirty와 HARD_STOP
- 검증된 결과와 미검증 주장
- content/lifecycle/delivery/approval 상태
- 잔존 위험과 금지 행동
- exact next action과 사람 게이트 하나
- 새 세션용 첫 응답 ACK 계약

`prepared → sent → acknowledged`를 분리한다. 새 세션이 scope, ref, current gate와 exact next action을 되말하기 전에는 인수인계 완료가 아니다.

## 8. 하드게이트

main/master merge, PR Ready, 배포, publish, 삭제·대규모 이동, 사용자 홈 설치, 인증·시크릿 변경, 유료 호출 확대, 운영 DB·Notion 쓰기는 해당 범위를 명시한 사람 승인 전 중단한다. 이전 계획 승인은 그 계획의 다음 사람 하드게이트까지만 유효하다.
