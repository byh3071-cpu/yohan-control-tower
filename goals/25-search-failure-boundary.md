---
vhk_format: 1
type: goal
id: 25
title: LLM 검색 실패와 정상 0건 구분
status: DONE
priority: P0
size: L
execution_provider: orca-ready
automatic_fallback: false
completed: 2026-08-26
---

# Goal 25: LLM 검색 실패와 정상 0건 구분

## Objective

`/api/search`가 정상적인 AI 검색 0건과 해석할 수 없는 upstream 응답을 서로 다른 계약으로 반환하게 만들고, command palette도 API 실패를 빈 결과로 오인하지 않도록 한다.

## Scope

- no-key keyword 검색과 upstream HTTP non-ok keyword-fallback 성공 동작을 보존한다.
- AI 200 응답은 balanced top-level bracket 후보가 정확히 하나이고 JSON 파싱 결과가 평면 정수 배열 닫힌 검증을 통과한 경우에만 `method: "ai"` 200 성공으로 처리하며, 유효한 `[]`는 정상 0건이다.
- `content` 부재·비문자열·배열 미검출·JSON 실패·유효하지 않은 index는 raw upstream 내용, 응답 키, 개인 경로 없이 `502`, `ok: false`, `code: "AI_RESPONSE_INVALID"`, 안전한 한국어 `error`, `results: []`, `method: "ai"`로 반환한다.
- AI index는 정수·prompt에 노출한 `candidateDocs` 범위·중복 없음·최대 5개를 모두 만족해야 하며 prompt 생성·범위 검증·결과 매핑은 같은 최대 80개 slice를 사용한다.
- production route를 의존성 주입 가능한 순수 controller/handler에 연결하고 fake docs/key/fetch로 외부 호출 없는 단위 테스트를 둔다.
- command palette는 공유 응답 parser를 통해 API 실패를 `AI 검색 결과 없음`과 분리해 안전한 오류 문구로 표시한다.
- 잘못된 query의 기존 400 동작을 보존하고 malformed JSON body는 명시적 400으로 개선한다.
- 캐시 교체·same-origin·Content-Type·query 길이·timeout·전송 메타 최소화는 이번 Goal 밖의 잔존 위험으로 기록한다.

## Completion Check

- [x] no-key keyword와 upstream HTTP non-ok keyword-fallback의 기존 status·method·결과 동작이 단위 테스트로 고정된다.
- [x] AI 200의 balanced top-level 배열 후보가 정확히 하나인 직접 배열·문장 속 평면 정수 배열과 유효한 빈 배열만 `method: "ai"` 200 성공으로 구분된다.
- [x] AI 200의 content 부재·비문자열·배열 미검출·JSON 실패가 안전한 `AI_RESPONSE_INVALID` 502 계약으로 fail-closed 처리된다.
- [x] index 정수·`candidateDocs` 범위·중복·최대 5개 닫힌 검증이 적용되고 prompt 밖 index나 위반 응답은 문서 결과로 부분 수용되지 않는다.
- [x] production route가 의존성 주입 가능한 controller/handler에 연결되고 fake docs/key/fetch 테스트가 실제 외부 호출 0회를 증명한다.
- [x] command palette의 순수 client parser가 API 오류와 정상 AI 0건을 분리하며 UI 오류 문구 분기가 단위 검증된다.
- [x] malformed JSON body를 명시적 400으로 처리하고 잘못된 query의 기존 400 응답이 퇴행하지 않는다.
- [x] Goal 25 전용 checker, package script, 세션 로그, BACKLOG 잔존 위험 기록이 현재 범위와 reviewer 반례를 검증한다.
- [x] typecheck, lint, 전체 test, build, Goal 25 checker, `goal check --force`가 통과한다.

## Forbidden

- upstream raw content·응답 키·개인 절대경로를 오류 응답이나 로그에 노출
- 유효하지 않은 index 배열을 필터링해 부분 성공으로 수용
- no-key keyword 또는 upstream HTTP non-ok keyword-fallback을 실패 응답으로 변경
- 캐시 교체, same-origin, Content-Type, query 길이, timeout, 전송 메타 최소화로 범위 확장
- 기존 brain 파일 수정, 운영 Notion/외부 쓰기, Goal 24 lifecycle 변경, commit·push·PR·merge·deploy·publish

## Evidence Plan

- `src/lib/search-controller.test.ts`
- `src/lib/search-response.test.ts`
- `scripts/check-goal-25.mjs`
- `docs/log/2026-08-26-search-failure-boundary.md`
