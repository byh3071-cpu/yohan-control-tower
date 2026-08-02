# 패턴명

로컬 HTTP 쓰기 API의 loopback + same-origin 이중 경계

## 카테고리

auth

## 증상

로컬 전용 API가 Origin과 요청 URL의 origin이 같은지만 검사한다. 외부 hostname으로 들어온 요청도 두 값이 같으면 통과한다.

## 원인

same-origin 검사는 두 주소의 관계만 확인할 뿐, 그 주소가 실제 loopback인지 확인하지 않는다. DNS rebinding에서는 공격자 hostname이 127.0.0.1로 해석될 수 있다.

## 해결

요청 URL hostname을 localhost, 127.0.0.1, ::1의 닫힌 허용 목록과 먼저 대조하고, 그다음 Origin이 요청 URL의 origin과 정확히 같은지 확인한다. Origin 누락·URL 파싱 실패·외부 hostname은 모두 거부한다.

## 적용조건

브라우저에서 호출하는 로컬 전용 쓰기 API이며 외부 hostname이나 LAN 접근을 지원하지 않는 경우에 적용한다. LAN 접근이 필요하면 별도 인증·CSRF·Host 정책을 설계한다.

## 출처프로젝트

yohan-control-tower

## 태그

auth, localhost, same-origin, dns-rebinding, api

## 발견일

2026-08-02

## 출처DevLog

docs/log/2026-08-02-inbox-origin-boundary.md
