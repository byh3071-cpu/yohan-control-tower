# 인박스 로컬 Origin 경계 보강

날짜: 2026-08-02
브랜치: byh3071-cpu/yohan-inbox-zero-ui
관련: PR #29, ADR-001

## 작업

- 기존의 정확한 same-origin 비교에 loopback hostname 허용 목록을 추가했다.
- localhost, 127.0.0.1, ::1만 허용하고 외부 hostname은 Origin이 같아도 거부한다.
- 요청 URL과 Origin을 같은 공격자 도메인으로 맞춘 DNS rebinding 회귀 사례를 테스트에 추가했다.
- GET은 Origin이 생략되는 정상 동작을 보존하면서 loopback·Sec-Fetch-Site 경계로 외부 조회 유발을 차단했다.
- 요청 본문을 stream으로 읽어 바이트 상한 초과 즉시 취소하고, CLI 출력은 누적 byte counter로 제한했다.
- CLI timeout은 SIGTERM 뒤 2초 내 종료되지 않으면 SIGKILL로 승격한다.
- 동시 항목 처리 상태를 항목 ID Set으로 분리해 다른 요청 완료가 진행 중 표시를 지우지 않게 했다.
- 내부 500 오류는 브라우저에 일반 메시지만 반환하고 민감 키가 언급된 서버 로그 줄은 전체 숨김 처리했다.
- 마지막 페이지는 남은 목표 수만 요청하고, 호출부가 초과 반환해도 최대 표시 상한을 넘지 않게 잘랐다.
- Goal 1을 실제 검증 상태에 맞춰 DONE으로 닫고, 파생 상태 문서의 로컬 worktree 절대경로를 제거했다.

## 검증

- npm test: 21/21
- npm run typecheck
- npm run lint
- npm run build
- npm run verify:docs
- 실제 Brain master 연결: 활성 149건, 표시 149건

## 교훈

로컬 서비스에서 Origin과 요청 URL이 같다는 사실만으로는 로컬 요청임을 증명할 수 없다. DNS rebinding을 막으려면 정확한 origin 비교와 함께 요청 hostname을 loopback 허용 목록으로 제한해야 한다.

스트림·프로세스 출력처럼 상한이 있는 입력은 누적 결과 전체를 매번 다시 재지 말고 chunk별 바이트를 누적해야 한다. 상한을 넘는 순간 읽기·프로세스를 중단해야 메모리와 CPU 상한도 실제 계약이 된다.

## 역전파

- ADR-001의 POST 신뢰 경계에 loopback 조건과 DNS rebinding 거부를 반영했다.
- 범용 패턴은 docs/patterns/auth-loopback-origin-dns-rebinding.md에 기록했다.
