# 2026-08-26 `/api/run` 실행 신뢰 경계 강화

## 요약

Goal 24의 최초 구현은 `/api/run`의 셸 문자열·동적 args 경계를 제거했지만, 독립 검토에서 output redaction 과잉/누출, Content-Type prefix 허용, URL control 문자 허용이라는 blocking P1을 발견했다. Goal을 `IN_PROGRESS`로 되돌린 뒤 실패 테스트를 먼저 추가했고, 정상 URL·route와 원문 query는 보존하면서 경로·라벨 있는 비밀·인증값을 가리고 유사 JSON media type과 위험 control을 body/runner 전에 거부하도록 보정했다. 실제 명령은 실행하지 않고 fake resolver·runner로 executable·argv·cwd·options와 비호출을 검증했다.

## Facts / Inferences / Unknowns

### Facts

- 지정 worktree의 branch는 `control-tower-run-boundary`, 기준 HEAD는 `94cf87fce7ec69682079a324fe0c55865a468cfb`였다. 시작 시 의도된 dirty 14파일이 있었고 `.vhk/HARD_STOP`은 없었다.
- Goal 24는 최초 구현에서 `DONE`이었으나 독립 검토 P1 때문에 frontmatter를 `IN_PROGRESS`로 되돌리고 `goal sync` → `goal next`로 활성화했다. `docs/state/next-task.md`는 직접 편집하지 않았다.
- RED 실행은 controller 15개 중 4개가 실패해 `application/jsonp` 허용, C1 허용, `https://`·`/api/run` 과잉 마스킹, JSON/공백 포함 label·Basic 누출을 각각 재현했다. 수정 뒤 controller 15/15, 관련 전체 19/19가 통과했다.
- Content-Type은 대소문자를 무시한 정확한 `application/json`과 선택적 단일 `charset=utf-8`만 허용한다. `application/jsonp`, `application/json-seq`, `application/jsonEVIL`, `text/plain`, 다른 parameter는 body parse와 runner 전에 400으로 거부된다.
- `ingest:url`은 C0·DEL·C1·line/paragraph separator·bidi control을 원문 단계에서 거부하고, 정상 URL은 `parsed.href`로 바꾸지 않아 query와 단일 argv 원문이 유지된다.
- output은 cwd·Windows drive·대표 POSIX root·UNC 절대경로와 URL userinfo·Bearer/Basic·JSON-style/assignment secret label을 마스킹한다. 정상 HTTP(S) URL과 `/api/run` route는 보존한다.
- 첫 VHK verify는 테스트의 가짜 Bearer header 한 줄을 HIGH 1건으로 탐지해 4/5 실패했다. scanner를 무시하지 않고 런타임 문자열 조합 fixture로 바꾼 뒤 secret scan과 VHK verify가 통과했다.
- `.vhk/context.md`의 Goal 24·checker·테스트·로그 추가 및 존재하지 않는 과거 QA profile 목록 제거는 구조 갱신이고, 생성 시각 변경은 알려진 VHK #603 노이즈다.
- 독립 reviewer가 승인 없이 workspace 밖 Temp에 scratch/report를 생성한 운영 위반이 dispatch에 보고됐다. 해당 파일은 이 worker가 읽거나 삭제하지 않았으며 정리에는 별도 사람 승인이 필요하다.
- Completion Check 9개 확인 뒤 `goal done --id 24`가 gate를 재집행해 Goal 24를 `DONE`으로 전환했고, `goal next`가 VHK #558 전체 완료 snapshot을 만들었다. 이후 동일 required gates도 모두 다시 통과했다.
- 실제 brain action, 서버·브라우저, 외부 쓰기, Notion 쓰기는 수행하지 않았다. 로컬 Next.js 16 Route Handler 문서만 대조했다.

### Inferences

- executable과 argv가 분리되고 `shell:false`가 runner 타입·adapter·테스트에 함께 고정돼 URL query의 `&`, `$()`, `;`, `|`는 명령 구문이 아니라 단일 argv 데이터로 전달된다.
- 외부 host·cross-origin·검증 헤더 없는 POST와 잘못된 media type이 `request.json()` 전에 거부돼 body parsing, cwd 해석, runner 호출 비용을 유발하지 못한다.
- `execFile` timeout이 직접 자식을 종료하더라도 손자 프로세스까지 회수된다는 증거는 없다. process-tree kill 추가는 신규 설계라 이번 보정 범위에서 제외했다.

### Unknowns

- 부작용이 있거나 brain 환경에 의존하는 실제 9개 action은 실행하지 않아 runtime 결과는 미확정이다.
- POSIX registry는 PATH 상대 `npm`/`npx` executable을 사용한다. Windows registry가 구성하는 `npm-cli.js`/`npx-cli.js` 경로의 실제 존재도 이번 실행 없는 검증에서 확인하지 않았다.
- 의미 표식 없는 임의 문자열은 secret인지 결정론적으로 알 수 없어 heuristic redaction 범위 밖이다.
- 서버측 실패 로그가 없고 Goal checker가 문자열 포함 여부를 보는 정적 검사라는 한계가 남는다.
- Orca Run ID는 worker 계약에 제공되지 않았다. Task와 Dispatch receipt는 아래에 기록했다.

## 변경

- `src/app/api/run/route.ts`: production dependency wiring만 소유하는 15줄 Route Handler로 축소했다.
- `src/lib/run-command-controller.ts`: action registry, 정확한 JSON media type, URL/control allowlist, call-order, human gate, URL/route 보존형 bounded/redacted JSON 응답을 소유한다.
- `src/lib/run-command-runner.ts`: `execFile` adapter, `shell:false`, timeout/maxBuffer, failure kind 정규화를 소유한다.
- controller·runner·production route 테스트 19개로 실행 없는 exact-call/non-invocation과 P1 회귀 경계를 증명했다.
- Goal 24 checker를 27개 고유 assertion으로 강화하고 BACKLOG에 해소 범위와 P2를 분리했다.

## Gate Evidence

| Gate | 결과 | 수치 / 관찰 |
|---|---|---|
| 관련 run-command tests | PASS | 19 tests, 19 pass, 0 fail |
| `npm run typecheck` | PASS | exit 0 |
| `npm run lint` | PASS | 0 errors, 기존 범위 warning 5 |
| `npm test` | PASS | 119 tests, 4 suites, 119 pass, 0 fail |
| `npm run build` | PASS | Next.js 16.2.9, 21/21 static pages, `/api/run` dynamic route, 기존 NFT warning 1 |
| `goal check --id 24 --force` | PASS | typecheck·lint·test·build 4/4 + Goal 고유 assertion 27/27 |
| `vhk verify` | PASS | 5 pass / 0 fail / 0 skip / 0 warn (`typecheck`, `lint`, `test:run`, `build`, `secure scan`) |
| `git diff --check` | PASS | exit 0, whitespace error 0 |
| DONE 후 required gates 재검증 | PASS | 관련 19/19, typecheck exit 0, lint 0 errors·5 warnings, 전체 119/119, build 21/21·NFT warning 1, Goal 4/4+27/27, VHK 5/5, diff error 0 |

## 검수 심각도

- P0: 0
- P1: 0
- P2: 6 — timeout 손자 회수 미실측 추론, POSIX PATH 상대 executable, Windows CLI 경로 존재 미확정, 서버측 실패 로그 부재, 문자열 기반 정적 checker 한계, 무표식 secret heuristic 한계.

## 잔존 위험

- action 대상 프로젝트의 의존성·스크립트 부재 같은 runtime 실패는 generic `COMMAND_FAILED`로만 보인다. 서버 로그도 없어 운영 진단성이 낮지만 절대경로와 전체 command를 숨기는 현재 보안 경계는 유지했다.
- stdout/stderr redaction은 명시된 경로·userinfo·Bearer/Basic·secret label 형식을 막지만 의미를 알 수 없는 무표식 문자열까지 판정하지 않는다. 응답 cap과 registry 제한이 보조 경계다.
- POSIX PATH와 Windows CLI 경로 존재, timeout 손자 회수는 live/process-tree 검증 없이 보장하지 않는다. 정적 checker는 테스트 실행을 보조할 뿐 의미 검증을 대체하지 않는다.

## Orca Receipt

- Run: coordinator-supervised active Run, ID 미제공
- Task: `task_a00086a25f13`
- Dispatch: `ctx_ed1727ae5eca`
- 실행 공급자: `orca-ready`, `automatic_fallback=false`

## 남은 사람 게이트

commit·push·PR·merge·deploy·publish는 이번 Dispatch 범위 밖이며 수행하지 않았다.
