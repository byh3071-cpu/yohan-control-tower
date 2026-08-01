# 2026-08-01 — 인박스 무손실 캡처 상한 정합 보강 (Tower #29 리뷰 후속)

## 결론
서버 요청 바이트 상한(`MAX_REQUEST_BYTES` 120,000)이 UI·CaptureEnvelope.v1 이 허용하는
raw_text 100,000자를 실제 UTF-8(한글 3바이트/자)에서 수용하지 못해 유효한 캡처를
거절하던 결함을 고쳤다. 한도는 이제 글자수 한도에서 유도한다.

## 무엇이 문제였나
| 계층 | 한도 | 한글 100,000자 실측 |
|---|---|---|
| UI textarea | 100,000자 | 통과 |
| CaptureEnvelope.v1 (`normalizeRequiredText`) | 100,000자 | 통과 |
| `/api/inbox` 바이트 상한 | 120,000바이트 | **300,000바이트 → 거절** |

무손실 수집이 정체성인 인박스에서 "UI 는 허용, 서버는 거절" = 계약 위반.

## 해법 — 가장 단순한 한도 정책
- 신규 `src/lib/inbox-limits.ts` = 한도 SoT (클라이언트 안전 모듈).
  - `CAPTURE_CONTENT_MAX_CHARS = 100_000`, `CAPTURE_NOTE_MAX_CHARS = 8_000`
  - `MAX_REQUEST_BYTES = (100_000 + 8_000) × 6 + 2_048` — UTF-16 유닛당 JSON 직렬화
    최악 6바이트(한글 3·이모지 유닛당 2·`\uXXXX` 이스케이프 6)로 유도. 글자수 검증은
    서버가 따로 하므로 바이트 상한은 DoS 겉껍질일 뿐 타이트할 이유 없음.
- `readJsonBody` 를 `inbox-controller.readInboxJsonBody` 로 이동(테스트 가능) —
  content-length 헤더 조기 거절 + 실제 UTF-8 바이트 재검사 2단 유지.
- UI(`yohan-inbox-panel`) maxLength 3곳·컨트롤러 글자수 한도를 전부 상수로 교체.

## 회귀 테스트 (src/lib/inbox-controller.test.ts)
- 한국어·이모지 100,000자(+노트 8,000자) 요청: 바이트 상한 통과 + envelope 무손실 보존.
- 상한 초과: ①거짓 content-length 헤더 조기 거절(본문 안 읽음 검증) ②헤더 없어도
  실제 바이트 재검사로 거절.

## 게이트
test 20/20 · typecheck 0 · lint 0 · build 통과.

## 교훈
바이트 상한과 글자수 상한을 서로 다른 단위·다른 파일의 마법수로 두면 멀티바이트
문자에서 반드시 어긋난다. 파생 가능한 한도는 원천 한도에서 식으로 유도해 한 파일에
모아라 (UI·검증·전송 3계층 공유).

## 범위 밖 (건드리지 않음)
리뷰의 low 관찰(DNS/ARIA/문서명) — 별도 처리 대상.
