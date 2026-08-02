/**
 * 인박스 캡처 한도 SoT — UI 입력(maxLength)·서버 글자수 검증·요청 바이트 상한이
 * 전부 이 파일에서 갈라져 나온다. 값이 세 곳에서 따로 놀면 "UI 는 허용했는데
 * 서버가 거절"하는 무손실 캡처 위반이 생긴다 (Tower #29: 한글 100,000자는
 * UTF-8 로 300,000바이트라 옛 상한 120,000바이트에 걸렸다).
 *
 * 클라이언트 컴포넌트도 import 하므로 Node 전용 모듈을 여기서 import 하지 마라.
 */

/** CaptureEnvelope.v1 raw_text 상한(자, UTF-16 코드유닛) — UI textarea maxLength 와 동일해야 한다. */
export const CAPTURE_CONTENT_MAX_CHARS = 100_000

/** user_note · my_thoughts 상한(자) — 사람 메모 크기의 공통 한도. */
export const CAPTURE_NOTE_MAX_CHARS = 8_000

/**
 * JSON 문자열 안에서 UTF-16 코드유닛 1개가 차지할 수 있는 최대 UTF-8 바이트.
 * 한글 3 · 이모지 4(2유닛이므로 유닛당 2) · `\uXXXX` 이스케이프 6 —
 * 어떤 직렬화기를 쓰든 유닛당 6바이트를 넘을 수 없다.
 */
const MAX_JSON_BYTES_PER_UTF16_UNIT = 6

/** content·note 밖의 고정 필드(action 등)와 JSON 구두점 몫 여유분. */
const REQUEST_OVERHEAD_BYTES = 2_048

/**
 * 요청 본문 바이트 상한. 정책: "글자수 한도를 지킨 유효한 요청은 인코딩·이스케이프
 * 방식과 무관하게 절대 거절되지 않는다." 실제 글자수 검증은 서버(inbox-controller)가
 * 따로 하므로 이 값은 DoS 방지용 겉껍질일 뿐, 타이트하게 조일 이유가 없다 —
 * 글자수 한도에서 최악 배수로 유도한다.
 */
export const MAX_REQUEST_BYTES =
  (CAPTURE_CONTENT_MAX_CHARS + CAPTURE_NOTE_MAX_CHARS) * MAX_JSON_BYTES_PER_UTF16_UNIT +
  REQUEST_OVERHEAD_BYTES
