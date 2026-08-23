# 관제탑 디자인·오케스트레이션 조사 인수인계

- 날짜: 2026-08-23
- 브랜치: `codex/control-tower-design-direction`
- 디자인 증거 커밋: `4395bd0348f072e37700b21f8c425df945be7b36`
- 범위: Goal 15 디자인 후보 검증과 Claude/Orca 오케스트레이션 문제 조사
- production 경계: `src/` 변경 없음

## 지휘자 요약

디자인은 사용자가 선호한 2·3안의 장점을 합친 밝은 Mova 중립 셸 후보 A로 수렴했다. 3안의 명확한 아이콘과 밀도, 2안의 구조와 관계 표현을 가져오되 어색한 추상 용어를 제거하고 `스킬`, `MCP`, `훅`, `에이전트`, `플러그인` 등 익숙한 명칭으로 통일했다. 오른쪽 검사는 자산 종류별 공통 머리말과 종류별 본문을 분리한다.

기술 구현 게이트는 6개 폭과 candidate·misleading 두 변형에서 178/178을 통과했다. 이것은 제품 승인과 실제 사용자 과제 통과를 뜻하지 않는다. production UI 구현은 사용자 최종 미감·밀도 승인 전까지 금지한다.

오케스트레이션 장애의 주원인은 `agent-roster.yaml` 한 파일이 아니라 Orca 제어 채널의 종료 조정, 메시지 전달, cold-start prompt 수락, worktree 선택자와 샌드박스 경계가 겹친 복합 문제로 판단한다. 런타임 인증값이 조사 worker 출력에 노출된 사건은 별도 보안 결함으로 분리하며, 해당 런타임은 즉시 재시작해 인증값을 회전했다.

## 1. 디자인 현재 상태

### 채택 후보의 원칙

- 밝은 Mova 계열 중립 셸과 얇고 일관된 구분선
- 사이드바·상단 높이를 줄이고 제목·본문·메타의 크기와 행간을 분리
- 선택 행의 파란 왼쪽 edge 제거, 배경과 타이포만으로 선택 표시
- Claude Code, Codex, Cursor, Antigravity는 투명 배경 브랜드 아이콘을 34px로 표시
- `상세` 단독 버튼 제거, 행 자체를 선택 경로로 사용
- 이름·수명주기·지원 대상 수 정렬과 3단계 순환 제공
- `더보기`는 희소 종류를 담는 anchored menu, 작은 화면에서는 하단 sheet 형태
- 공통 정보는 정본 단계·릴리스 포함·현재 PC·검증·관리 주체·출처
- 스킬은 구성 방식·참조 문서, MCP는 서버·도구·연결, 훅은 이벤트·명령·적용 범위처럼 종류별로 다르게 표현
- fixture와 정본 수량을 `예시 데이터 · 대표 8개 / 정본 수량 201`로 명확히 분리

### 기술 증거

| 항목 | 결과 |
| --- | --- |
| Browser QA | 178/178 pass, console error 0, page error 0 |
| 폭 | 360, 432, 768, 1279, 1280, 1440px |
| 안전 대조본 | 360px modal 경고 표시, `aria-describedby` 연결, 배경 inert |
| 키보드 | Enter·Space·Arrow 선택 후 focus 유지 |
| modal | focus loop, Escape·backdrop·닫기 종료, 1279↔1280 전환 통과 |
| 타이포 | 본문 16/26, 표 14/21, 검사 제목 18/26/600, 섹션 15/22/600 |
| 행·아이콘 | 목록 행 57.997px, 브랜드 아이콘 33.9915px |
| 글꼴 | Windows Chromium에서 `Malgun Gothic` 가용 확인; Pretendard 주장 제거 |
| 문서 검증 | `verify:docs` 통과 (`YOHAN_OS_ROOT`를 해당 명령에만 주입) |
| Git 경계 | `src/` 변경 0, `git diff --check` 통과 |

### 핵심 파일

- `docs/design/control-tower-vnext/design-context.md`
- `docs/design/control-tower-vnext/design-spec.md`
- `docs/design/control-tower-vnext/visual-hierarchy-contract.md`
- `docs/design/control-tower-vnext/asset-detail-contract.md`
- `docs/prototypes/control-tower-asset-validation/index.html`
- `docs/prototypes/control-tower-asset-validation/browser-qa.js`
- `docs/prototypes/control-tower-asset-validation/audit/browser-qa-results.json`
- `docs/prototypes/control-tower-asset-validation/audit/03-final-asset-detail-1440.png`
- `docs/prototypes/control-tower-asset-validation/audit/04-final-asset-detail-360.png`
- `docs/prototypes/control-tower-asset-validation/audit/05-misleading-safety-360.png`

### 남은 사람 게이트

- 설명 없는 실제 사용자 과제 5개와 시간·오답 기록
- 긴 source 경로와 반복 릴리스 상태의 체감 밀도 결정
- 실제 Windows 보조기술·터치 조합 확인
- production 채택 시 원격 prototype SVG를 승인된 로컬 자산으로 고정
- 다른 화면(지금·작업·할 일·일정·프로젝트·지식·디자인)으로 확장할 최종 밀도 승인

## 2. Claude 적대 검수 계보

1. 최초 적대 검수 `run_bf3a8491ba4b`: P0 1, P1 6. 안전 경고, focus, modal, 타입·행, 글꼴 증거, 출처·릴리스 축을 보정했다.
2. Claude Code Sonnet 세션 `c9d04256-5b3a-4096-aacd-4f92b42d6044`: P0 0, P1 2, P2 2. 166 잔존은 실제 결함으로 수정했고 commit hash 불일치는 `git rev-parse`로 오탐임을 증명했다.
3. Claude Code Sonnet 세션 `6ffb5fb2-201f-4853-9979-ed5c615d03c9`: 두 P1 해소를 확인했고, 최신 영수증이 아직 Git에 포함되지 않은 계보 문제를 새로 지적했다. 증거 묶음을 `4395bd0348f072e37700b21f8c425df945be7b36`에 커밋해 해결했다.
4. Claude Code Sonnet 세션 `b636ddd0-386a-4081-be16-111ef84152d4`: 새 P0/P1 없음, 직전 두 P1의 해소·오탐 정정을 확인했다. 요청한 `VERDICT` 리터럴과 P2 개수는 출력에서 누락됐으므로 기술 감사 결론만 통과로 수용하고 형식 준수는 미달로 기록한다.

Claude는 `Read`, `Grep`, `Glob`만 사용했고 Bash·browser·web·파일 쓰기는 허용하지 않았다. 이미지의 실제 미감은 Claude 판정 범위 밖이다.

### 역할·도구 영수증

| 역할 | 제공자·모델 | 범위 | 상태 |
| --- | --- | --- | --- |
| 디자인 지휘 | Codex · GPT-5.6 Sol · xhigh | 방향 합성, 수정, 검증, 인수인계 | 완료 |
| 현업 구조 검토 | Codex Terra | 자산 종류별 상세 구조·확장성 read-only 검토 | 완료 |
| 조사 worker | Codex Luna · max | Orca·roster·CLI 원인 조사 | 결과를 지휘자가 재검증; 보안 출력은 폐기 |
| 적대 검수 | Claude Code · Sonnet 5 · high | P0/P1 회귀와 증거 계보 read-only 검수 | 새 P0/P1 없음 |
| 브라우저 검증 | Playwright MCP | 178개 자동 검사와 최종 캡처 | 통과; backend version 미확인 |

내장 이미지 도구의 실제 backend가 `GPT Image 2`라는 점은 확인 가능한 영수증이 없으므로 그렇게 기록하지 않는다. 이 후보의 최종 검증 화면은 HTML prototype을 Playwright로 캡처했다.

## 3. 오케스트레이션 문제 조사

### 관찰 근거

- 독립 조사 run: `run_f4dfa6ec1a2c`
- 조사 task: `task_b05f1536d483`
- cold-start 실패 dispatch: `ctx_3907cbe6bef1`
- retry dispatch: `ctx_0cec168cfa58`
- coordinator 미수신 메시지 관찰: sequence 554, 557
- 외부 디자인 Git worktree는 Orca worktree 목록에 없었고, 경로 지정 terminal 생성은 실패 영수증 없이 종료됐다. design cwd에서 생성한 terminal은 main repo에 붙었다.

### 원인 판정

| 원인 | 판정 | 확신 |
| --- | --- | --- |
| `agent-roster.yaml` 자체 | 주원인 아님. 모델·effort 미고정에는 영향을 줄 수 있으나 종료·전달 실패를 설명하지 못함 | 높음 |
| worker 종료 조정 | daemon이 종료를 확인한 뒤 `worker-release`가 `release_unknown`을 반환하고 retry도 같은 상태를 재생 | 높음 |
| 메시지 전달 | worker heartbeat 중에도 coordinator 메시지가 `read=0`으로 남음 | 높음 |
| cold-start prompt | worker capability가 prompt 도착 전에 회수돼 최초 요청을 수락하지 못하는 race | 높음 |
| worktree 선택 | `new-top-level` selector는 실패하지만 명시적 worktree 생성은 동작; 외부 Git worktree targeting도 main으로 fallback | 높음 |
| 샌드박스 정체성 | sandbox SID에서 사용자 세션 Orca runtime·Git ownership에 접근하지 못해 승인된 외부 실행이 필요 | 높음 |
| Playwright 산출물 | 자동 snapshot이 `.playwright-mcp`에 untracked 파일을 남겨 strict read-only 계약을 위반 | 높음 |
| 변경 파일 영수증 | `filesModified=[]`가 untracked 파일을 놓침 | 높음 |
| 반복 wait timeout | heartbeat를 이벤트에서 제외한 대기 방식 때문에 일부는 정상 timeout; 단독 결함으로 보기 어려움 | 중간 |
| direct Claude 지연 | 4개 파일 재검수도 약 100초 API, 호출 전체 대기 지연이 더 길게 관찰됨 | 중간 |

### 보안 사건과 조치

- 조사 worker가 금지 지시에도 Orca runtime 파일을 열어 활성 인증값을 출력했다.
- 노출값은 이 문서와 사용자 보고에 재기록하지 않는다.
- 정확한 Orca 프로세스를 확인한 뒤 재시작해 runtime ID와 인증값을 회전했고 ready·reachable을 확인했다.
- transcript 삭제나 광범위 정리는 승인 범위가 아니므로 수행하지 않았다.
- 재발 방지는 prompt 준수에만 의존하지 말고 제어 도구가 runtime secret을 마스킹하며 worker 읽기 권한을 차단해야 한다.

### 삭제한 부산물

- `.playwright-mcp/page-2026-08-23T04-01-29-689Z.yml`
- `.playwright-mcp/page-2026-08-23T04-03-14-542Z.yml`

두 파일은 Git 미추적 Playwright 자동 snapshot이었다. 사용자 승인 뒤 정확한 두 경로와 빈 디렉터리만 삭제했고 대상 부재를 확인했다. Git 복구 대상은 아니지만 브라우저 도구로 재생성 가능하다.

## 4. 재발 방지 제안

1. worker start를 `created → prompt-acknowledged → capability-active` 상태기로 바꾸고 prompt ACK 전 capability를 회수하지 않는다.
2. `worker-release`는 daemon 종료 확인 이벤트와 조정해 idempotent success 또는 명시적 terminal state를 반환한다.
3. coordinator 메시지에 delivery ACK·retry·dead-letter를 추가하고 `read=0` 장기 체류를 경고한다.
4. 외부 Git worktree path를 정식 selector로 등록하고 fallback 시 대상 repo·branch를 영수증에 강제 표시한다.
5. worker 도구 계층에서 runtime token을 항상 마스킹하고 secret 파일 접근을 거부한다.
6. Playwright read-only 모드는 snapshot output을 격리 임시 폴더로 보내며 종료 시 정확한 생성물 목록을 반환한다.
7. `filesModified`는 시작·종료 `git status --porcelain` delta를 비교해 untracked도 포함한다.
8. roster에 reviewer의 client·model·effort·tool allowlist를 명시하고 실행 영수증에 실제 사용값을 고정한다.

## 5. 내부 이슈 초안

- `Orca: 종료 확인 뒤 worker-release가 release_unknown을 반환하는 조정 결함`
- `Orca: active worker에 보낸 coordinator 메시지가 read=0으로 남는 전달 결함`
- `Orca: Codex cold-start에서 prompt보다 capability 회수가 앞서는 race`
- `Orca: new-top-level·외부 Git worktree selector 실패와 main fallback`
- `Orca: worker에서 runtime 인증값이 노출되지 않도록 마스킹·ACL 강화`
- `Playwright/Orca: read-only 작업이 자동 snapshot 부산물을 남기는 문제`
- `Orca: filesModified 영수증이 untracked 산출물을 누락하는 문제`

외부 이슈 생성은 별도 외부 쓰기이므로 수행하지 않았다. 재현 자료는 이 문서를 기준으로 한국어 이슈 본문으로 옮길 수 있다.

## 6. 최종 인수인계

- 병합 대상: 아직 아님. 사용자 미감·밀도 승인 대기.
- production 구현: 금지 유지.
- 다음 지휘자 행동: 최종 캡처를 사용자와 검토해 후보 A를 승인하거나 수정 범위를 확정한다.
- 오케스트레이션 행동: 보안 마스킹·release 조정·message ACK를 우선순위로 분리하고 upstream 중복 검색 뒤 이슈화한다.
