---
vhk_format: 1
type: goal
id: 24
title: 로컬 명령 실행 신뢰 경계 강화
status: DONE
priority: P0
size: L
execution_provider: orca-ready
automatic_fallback: false
completed: 2026-08-26
---

# Goal 24: 로컬 명령 실행 신뢰 경계 강화

## Objective

`/api/run`을 셸 문자열 실행 경계에서 고정 executable·argv 경계로 전환하고, 동일 출처 요청과 action별 입력 계약을 프로세스 실행보다 먼저 검증해 명령 주입·경로 오해석·민감 정보 노출을 차단한다.

## Scope

- 기존 11개 action을 executable·고정 argv·사람 게이트 속성을 가진 닫힌 registry로 모델링한다.
- 프로세스 실행은 `execFile`의 `shell: false` 계약만 사용한다. Windows는 `.cmd`를 직접 실행할 수 없는 Node 제약 때문에 `process.execPath`와 같은 설치에 결합된 `npm-cli.js`/`npx-cli.js` 경로를 고정 첫 argv로 구성한다. 해당 경로의 실제 존재는 이번 실행 없는 검증에서 보장하지 않는다.
- `ingest:url`만 자격 증명 없는 bounded HTTP(S) URL 원문 하나를 추가 argv로 허용하고, C0·DEL·C1·line/paragraph separator·bidi control은 파싱 전에 거부한다. `parsed.href`로 원문을 정규화하지 않으며 나머지 action은 `args` 필드 자체를 거부한다.
- Content-Type은 대소문자를 무시한 `application/json`과 선택적 단일 `charset=utf-8`만 허용하고 유사 media type은 body parse 전에 거부한다.
- `isSameOriginRequest`를 요청 본문·경로 resolver·runner보다 먼저 적용한다.
- `git:sync`와 `sync:notion:push`는 registry에 유지하되 항상 사람 게이트 403으로 차단한다.
- fake resolver·runner 기반 단위/route 테스트로 호출 순서, exact executable/argv/cwd/options와 비호출을 증명한다.
- 오류 응답은 일관된 JSON/status와 bounded output만 제공한다. 정상 HTTP(S) URL·route는 보존하고 cwd·drive·대표 POSIX·UNC 절대경로 및 URL userinfo·Bearer/Basic·라벨 있는 secret 형식은 마스킹한다.

## Completion Check

- [x] 외부 host·cross-origin·headerless mutation이 body·resolver·runner 호출 전에 403으로 차단된다.
- [x] Content-Type 유사값이 body parse 전에 거부되고 request body가 `unknown`에서 엄격 파싱되어 malformed JSON·잘못된 타입·unknown action·forbidden `args`가 결정론적 400 JSON을 반환한다.
- [x] `ingest:url`만 bounded credential-free HTTP(S) URL 원문을 받고 위험 control을 거부하며 query·shell metacharacter를 변경 없이 정확히 한 argv로 전달한다.
- [x] 모든 실행 action이 고정 registry의 executable·argv를 `shell: false`, 명시 cwd, timeout, maxBuffer로 실행하며 Windows node/CLI 구성과 POSIX npm/npx 경계가 테스트되고 shell 문자열·command concat·args blacklist가 없다.
- [x] `git:sync`·`sync:notion:push`가 403 humanGate 응답을 보존하고 resolver·runner를 호출하지 않는다.
- [x] runner 성공·실패·timeout·buffer 오류가 bounded JSON/status로 처리되고 정상 URL·route는 보존하면서 라벨 있는 비밀·인증값·cwd·drive/POSIX/UNC 절대경로·전체 command를 응답에 노출하지 않는다.
- [x] 실행 없는 unit/route tests가 exact 호출 계약·호출 순서·비호출을 증명하고 기존 UI 문구/호환을 보존한다.
- [x] 관련 테스트, typecheck, lint, 전체 test, build, Goal 24 check, VHK verify, git diff check가 모두 통과한다.
- [x] 세션 로그와 BACKLOG가 독립 검토 P1 보정, 사실·추론·미확정, 정확한 gate 수치, P0/P1/P2, 잔존 위험, 운영 위반과 최소 Orca receipt를 실제 근거로 기록한다.

## Forbidden

- 셸 문자열 실행, 동적 executable/argv, command 문자열 결합, args 블록리스트
- `resolveRepoRoot()` 이외 cwd 추론 또는 암묵 폴백
- 실행 결과에 전체 명령·절대경로·비밀·무제한 stdout/stderr 포함
- `git:sync`·`sync:notion:push` 실행 또는 사람 게이트 완화
- 기존 brain 파일 수정, Notion/외부 쓰기, commit·push·PR·merge·deploy·publish

## Evidence Plan

- `src/lib/run-command-controller.test.ts`
- `src/lib/run-command-runner.test.ts`
- `src/lib/run-command-route.test.ts`
- `scripts/check-goal-24.mjs`
- `docs/log/2026-08-26-run-command-boundary.md`
