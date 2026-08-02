---
id: ADR-001
date: 2026-07-30
status: accepted
tags: [inbox, local, process-boundary, security, brain]
---

# ADR-001: 로컬 인박스는 yohan-brain CLI 경계로만 제어한다

## 맥락 (Context)

관제탑에서 요한 인박스의 수집·상태 조회·사람 결정·정본 승격을 다뤄야 한다. 큐 스키마와 상태 전이, write-once 정본 승격의 소유자는 yohan-brain이다. 관제탑이 SQLite나 brain 파일을 직접 다루면 같은 규칙이 두 레포에 생기고, UI와 CLI의 의미가 갈라진다.

기존 범용 명령 라우트는 문자열 명령과 인자를 조합하므로 인박스의 구조화된 JSON·사람 게이트를 맡기기에는 경계가 넓다. 이 결정은 사용자가 승인한 Inbox Zero Plan의 “brain CLI가 권위, 관제탑은 운영 표면” 경계를 기록한다.

## 결정 (Decision)

- 관제탑은 전용 **/api/inbox** Route Handler만 사용한다.
- 서버는 **YOHAN_OS_ROOT**로 brain을 찾고, brain의 고정 tsx 실행기와 고정 인박스 CLI만 호출한다.
- 실행은 **process.execPath**, argv 배열, 고정 cwd, **shell:false**, 타임아웃, 출력 상한으로 제한한다.
- 브라우저가 보낸 임의 명령·경로·플래그는 받지 않는다. action·disposition·UUID를 코드의 닫힌 목록으로 검증한다.
- POST는 localhost·127.0.0.1·::1 중 하나를 쓰는 정확한 same-origin 요청만 허용한다. 요청 URL과 Origin을 같은 외부 도메인으로 맞춘 DNS rebinding 형태도 거부한다.
- GET은 loopback URL만 허용하고 Sec-Fetch-Site=cross-site 또는 명시적으로 다른 Origin을 거부한다. 같은 출처 GET에서 Origin이 생략되는 정상 브라우저 동작은 허용한다.
- 요청 본문은 content-length를 먼저 검사하고, 실제 stream도 누적 바이트 상한을 넘는 순간 취소한다. 내부 500 오류는 브라우저에 상세를 노출하지 않고 서버 로그에서도 민감 키가 언급된 줄 전체를 숨긴다.
- 큐와 정본 규칙은 brain CLI 응답을 권위로 삼는다. 관제탑은 SQLite를 직접 열거나 정본 파일을 직접 쓰지 않는다.
- 운영 목록은 brain CLI의 **active + offset** 페이지를 100건씩 이어 붙인다. 첫 100건 뒤의 활성 항목을 숨긴 채 “0건”으로 판정하지 않으며, 보호 상한에 걸리거나 중간 페이지가 비면 활성 총계와 표시 건수의 차이를 화면에 경고한다.
- 사람 결정 저장과 write-once 정본 승격은 별도 동작으로 유지한다.

## 대안 (Alternatives)

1. **관제탑이 SQLite와 brain 파일을 직접 조작** — UI가 빠르지만 상태 전이·승격 규칙이 중복되고 복구 계약이 갈라져 기각했다.
2. **기존 /api/run 재사용** — 범용 문자열 명령 경계가 넓고 stdin JSON과 항목별 사람 게이트를 표현하기 어려워 기각했다.
3. **클라우드 API/릴레이 추가** — 모바일 실시간 처리에는 유리하지만 현재 로컬 우선·무과금·시크릿 비범위와 맞지 않아 후속 선택지로 남겼다.

## 결과 (Consequences)

- 장점: brain의 상태 머신과 write-once 계약이 단일 SoT로 유지되고 CLI·UI 결과가 같은 뜻을 갖는다.
- 비용: 로컬 Node가 brain 인박스 런타임 요구사항을 만족하고 brain 의존성이 설치돼 있어야 한다.
- 실패 모드: CLI·tsx·env가 없으면 0건으로 위장하지 않고 인박스 패널에 일반 오류를 표시하며, 상세는 민감 줄을 가린 서버 로그에서 확인한다.
- 운영 제약: 인증·배포·스케줄러·플랫폼 보관함 해제는 이 라우트에 추가하지 않는다.
- 되돌리기: 전용 패널과 Route Handler를 제거하면 기존 SoT 초안 흐름으로 돌아갈 수 있으며, brain 큐·정본 데이터는 영향을 받지 않는다.
- 남은 사람 게이트: Control Tower PR 머지, 실제 Telegram/플랫폼 수집 실행, 플랫폼 읽음·저장 해제, 스케줄러 활성화.
