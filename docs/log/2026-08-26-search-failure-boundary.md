# Goal 25 — LLM 검색 실패와 정상 0건 구분

## Outcome

`/api/search`의 AI 200 응답을 닫힌 배열 계약으로 검증하고, 해석 실패를 정상 `[]`와 다른 안전한 502로 반환하도록 분리했다. command palette는 공유 client parser를 사용해 API 실패를 `AI 검색 결과 없음`으로 렌더링하지 않는다.

## Facts / Inferences / Unknowns

- 사실: 기존 no-key keyword는 title·excerpt·tags를 검색하고, upstream HTTP non-ok의 keyword-fallback은 title·excerpt를 검색한다. 두 성공 경로와 8건 상한을 유지했다.
- 사실: AI 성공은 `content`에서 balanced top-level bracket 후보를 정확히 하나 추출한 뒤 JSON 파싱 결과가 평면 정수 배열, `candidateDocs` 범위, 중복 없음, 최대 5개를 모두 만족할 때만 반환한다. 유효한 `[]`는 200 정상 0건이다.
- 사실: content 부재·비문자열·배열 미검출·JSON 실패·index 계약 위반은 raw upstream 내용·키·개인 경로가 없는 고정 `AI_RESPONSE_INVALID` 502 응답이다.
- 사실: prompt 생성·index 범위 검증·결과 매핑은 모두 `docs.slice(0, 80)`으로 만든 동일 `candidateDocs`를 사용한다. 100개 fixture에서 79는 성공하고 prompt 밖 80·90은 502가 된다.
- 사실: fake docs/key/fetch 기반 테스트는 no-key 경로의 upstream 호출 0회와 모든 AI/fallback 경로의 주입 fetch 사용을 검증한다.
- 사실: 잘못된 query의 기존 400을 보존하고, 기존 route에서 예외 경계에 맡기던 malformed JSON body는 controller에서 명시적 400으로 개선했다.
- [추론]: 닫힌 index 검증은 잘못된 일부 index만 필터링해 그럴듯한 부분 성공을 만드는 것보다 운영자가 upstream 이상을 알아차리기 쉽다.
- 미확정: 실제 OpenAI 네트워크 호출과 실데이터 corpus 결과 품질은 이번 실행 없는 단위 검증에서 확인하지 않았다.

## TDD Evidence

- RED: 구현 파일이 없을 때 `node --import tsx --test src/lib/search-controller.test.ts src/lib/search-response.test.ts`가 `MODULE_NOT_FOUND` 2건으로 실패했다.
- GREEN: controller·client parser·production route 연결·palette 분기를 구현한 뒤 같은 명령에서 12/12 테스트가 통과했다.
- Correction RED: reviewer 반례 2개를 추가한 뒤 같은 target에서 기존 12개는 통과하고 새 2개만 실패했다. `[[0,1]]`은 실제 200(기대 502), prompt 밖 `[80]`도 실제 200(기대 502)이었다.
- Correction GREEN: balanced top-level 추출과 단일 `candidateDocs` slice를 적용한 뒤 target 14/14가 통과했다.

## Reviewer P1 Correction

1. P1 — 문자열 정규식이 중첩 배열의 안쪽 `[0,1]` 또는 `[2]`를 유효 후보로 오인했다. `[[0,1]]`, `[[[2]]]`, `[ [0, 1] ]`을 502 반례로 고정하고 depth 기반 top-level bracket 후보가 정확히 하나일 때만 JSON 파싱하도록 교정했다.
2. P1 — prompt는 최대 80개만 노출하지만 범위 검증과 결과 매핑은 전체 docs를 사용했다. 동일 `candidateDocs` slice를 세 단계에 재사용하고 100개 fixture에서 79 성공·80/90 실패와 prompt 비노출을 검증했다.
3. P1 — 문서가 malformed body의 "기존 400 보존"이라고 잘못 기록했다. 실제 기준선은 잘못된 query의 400 보존이고 malformed JSON은 이번 controller가 명시적 400으로 개선한 것이므로 Goal·테스트 명칭·이 로그를 바로잡았다.

- correction evidence: target RED 12 pass/2 fail → GREEN 14/14, checker는 중첩 3종·복수 top-level 후보·79/80/90 경계 테스트 문자열의 존재를 필수로 검사한다.

## Gate Evidence

| Gate | Result |
| --- | --- |
| `node --import tsx --test src/lib/search-controller.test.ts src/lib/search-response.test.ts` | PASS (14/14) |
| `npm run typecheck` (구현 직후 빠른 확인) | PASS |
| `npm run lint` | PASS (0 errors, 기존/비범위 5 warnings) |
| `npm test` | PASS (133/133) |
| `npm run build` | PASS (Next.js 16.2.9) |
| `npm run check:goal-25` | PASS (기본 4 gate + Goal 고유 23항목) |
| `npm run vhk -- goal check --id 25 --force` | PASS |

- build는 성공했지만 `next.config.ts → memory.ts → /api/search` import trace가 프로젝트 전체를 NFT 추적할 수 있다는 Turbopack 경고 1건을 남겼다. 동적 로컬 filesystem 접근의 기존 구조와 연결되며 이번 실패/0건 계약의 차단 사유는 아니다.
- lint 경고 5건은 기존 `docs/prototypes/.../browser-qa.js` 1건과 기존 Goal checker의 unused `must` 4건이며 Goal 25 변경 파일에서는 발생하지 않았다.

## Scope Defense / Remaining Risk

- 완료: silent fallback 제거, 정상 0건과 AI 응답 실패 분리, 기존 keyword 성공 경로 보존, 잘못된 query 400 보존, malformed JSON 명시적 400, UI 오류 분기.
- 보류(P2): 캐시 교체, same-origin, 정확한 Content-Type, query 길이, timeout, 전송 메타 최소화.
- 보류(P2): fetch network rejection의 API 응답 정규화와 실제 upstream E2E는 별도 계약이 필요하다.
- 보류(P2): command palette 연속 검색의 request id/abort 기반 응답 순서 fence는 별도 비동기 UI 계약이 필요하다.
- 보류(P2): Turbopack NFT project-wide trace 경고의 원인 분리와 번들 추적 범위 축소는 별도 성능·패키징 범위다.
- checker의 문자열 정적 검사는 단위/전체 테스트와 build를 보조할 뿐 런타임 의미의 완전한 증명은 아니다.

## Context Regeneration

- 시작 시 Scout 파생 diff를 보존했다. 당시 `next-env.d.ts`·`tsconfig.tsbuildinfo` 트리 제거와 최근 git log/HEAD 갱신은 파생 구조 변경이고, 생성 시각 변경은 노이즈로 분류했다.
- 필수 build가 두 생성물을 다시 만들었으므로 최종 context에서는 해당 트리 제거가 상쇄됐다. Scout 변경을 되돌린 것이 아니라 검증 산출물의 실제 존재를 다시 반영한 결과다.
- correction 종료 직전 마지막 `npm run vhk -- context` 1회로 Goal 25 `IN_PROGRESS`, controller·response parser와 14개 target 테스트, 23항목 checker, reviewer correction 로그, BACKLOG P2의 최신 구조를 반영했다.
- 생성 시각과 `_vhk-context-git` 갱신은 파생 노이즈이며, 신규 파일·Active Goal·교정된 파일 트리는 구조 변경이다.

## Lifecycle

- Goal 25만 `goal sync`·`goal next`로 활성화해 구현·검토했고, 메인 지휘자 최종 게이트와 `goal done --id 25` 재검증을 모두 통과해 `DONE`으로 닫았다.
- 완료 뒤 `goal next`가 VHK #558 보정 경로로 `TASK: 없음 — 모든 Goal 완료 / status: DONE` snapshot을 만들었고, `goal peek`·`goal list`에서 active Goal 없음과 Goal 1~25 전부 `DONE`을 확인했다.
- commit·push·PR은 수행하지 않고 Git 사람 게이트에서 멈춘다.
