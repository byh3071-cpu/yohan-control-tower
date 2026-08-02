# 인박스 로컬 Origin 경계 보강

날짜: 2026-08-02
브랜치: byh3071-cpu/yohan-inbox-zero-ui
관련: PR #29, ADR-001

## 작업

- 기존의 정확한 same-origin 비교에 loopback hostname 허용 목록을 추가했다.
- localhost, 127.0.0.1, ::1만 허용하고 외부 hostname은 Origin이 같아도 거부한다.
- 요청 URL과 Origin을 같은 공격자 도메인으로 맞춘 DNS rebinding 회귀 사례를 테스트에 추가했다.
- Goal 1을 실제 검증 상태에 맞춰 DONE으로 닫고, 파생 상태 문서의 로컬 worktree 절대경로를 제거했다.

## 검증

- npm test: 20/20
- npm run typecheck
- npm run lint
- npm run build
- npm run verify:docs
- 실제 Brain master 연결: 활성 149건, 표시 149건

## 교훈

로컬 서비스에서 Origin과 요청 URL이 같다는 사실만으로는 로컬 요청임을 증명할 수 없다. DNS rebinding을 막으려면 정확한 origin 비교와 함께 요청 hostname을 loopback 허용 목록으로 제한해야 한다.

## 역전파

- ADR-001의 POST 신뢰 경계에 loopback 조건과 DNS rebinding 거부를 반영했다.
- 범용 패턴은 docs/patterns/auth-loopback-origin-dns-rebinding.md에 기록했다.
