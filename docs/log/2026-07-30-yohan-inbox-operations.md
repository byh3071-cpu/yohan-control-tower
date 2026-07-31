---
날짜: 2026-07-30
작업: 요한 인박스 제로 운영 화면과 brain CLI 연결
브랜치: byh3071-cpu/yohan-inbox-zero-ui
관련: docs/adr/ADR-001-local-inbox-cli-bridge.md
---

# 요한 인박스 제로 운영 화면 연결

## 배경

Instagram·Threads·YouTube·X 등에 저장한 자료가 모바일 보관함마다 쌓이고, 집 PC에서 다시 읽고 판단하기 전에는 실제 지식·스킬·행동으로 바뀌지 않았다. 기존 Telegram→brain 흐름은 수신 즉시 OCR·URL ingest를 실행해 원본 보존과 판단이 한 단계에 섞였고, 처리 상태도 눈에 보이지 않았다.

이번 작업은 yohan-brain을 승인 정본의 SoT로 유지하면서, 로컬 SQLite 운영 큐를 거쳐 사람 결정 뒤에만 write-once 산출물을 만드는 구조를 관제탑의 기존 문서 인박스 표면에 연결한다. 새 여섯 번째 탭은 만들지 않는다.

## 한 일

1. 전용 **/api/inbox** Route Handler와 **inbox-controller**를 추가했다.
2. 관제탑은 SQLite나 brain 파일을 직접 다루지 않고, **YOHAN_OS_ROOT**로 찾은 brain의 고정 tsx·인박스 CLI만 호출한다.
3. 실행 경계는 **process.execPath + argv 배열 + shell:false + 고정 cwd + 30초 timeout + 출력 상한**으로 닫았다.
4. POST는 same-origin·JSON 크기·UUID·action·disposition·행동 ID를 검증한다. Content-Length가 없거나 거짓이어도 실제 UTF-8 바이트 수를 다시 검사한다.
5. 기존 인박스 표면에 빠른 무손실 수집, 활성/판단/보류/실패 수, 단계·상태·원문 링크·AI 요약·요한 관련성·불확실성·사람 결정을 배치했다.
6. **처리 결정 저장**과 **정본 승격 승인**을 별도 사람 동작으로 유지했다. 승격 직전에는 확인 대화상자를 한 번 더 거친다.
7. 기존 SoT 초안 도구는 제거하지 않고 접힌 보조 도구로 보존했다.
8. 활성 목록은 100건 단위 **active + offset** 페이지를 이어 붙인다. 권위 활성 총계가 0일 때만 “인박스 제로”를 표시하고, 표시 건수가 모자라면 경고한다.

## 발견한 결함과 교훈

### 첫 페이지만 클라이언트 필터하면 거짓 0건이 된다

처음 구현은 전체 목록의 오래된 100건만 읽고 완료 항목을 브라우저에서 제외했다. 완료 항목이 앞 페이지를 채우면 뒤쪽 활성 자료가 남아 있어도 빈 화면을 “활성 0”으로 표시할 수 있었다. 당시 후보 조회는 X 10건 + YouTube 105건이었고, 최종 live export는 YouTube 98건이라 어느 쪽도 한 페이지를 넘는 결함이었다.

**교훈:** 페이지 집합과 0건 판정 집합은 같아야 한다. 활성 여부를 권위 CLI 조회 조건으로 올리고, 총계만큼 안정 페이지를 읽으며, 0건은 집계값으로만 판정한다. 범용 패턴은 [ux-client-filter-after-pagination-false-zero](../patterns/ux-client-filter-after-pagination-false-zero.md)에 기록했다.

### 같은 로컬 DB라도 첫 연결을 무턱대고 병렬화하면 안 된다

상태와 목록 CLI를 동시에 시작하면 두 프로세스가 SQLite 초기화·PRAGMA를 함께 수행한다. 읽기 요청처럼 보여도 첫 연결에는 쓰기 잠금이 포함될 수 있다.

**교훈:** 상태를 먼저 읽고 목록을 순차 페이지네이션한다. brain Store에도 busy timeout을 두어 Telegram·CLI·관제탑의 짧은 경합을 즉시 실패로 만들지 않는다.

### 요청 크기는 Content-Length만 믿을 수 없다

헤더가 없거나 잘못된 클라이언트는 큰 JSON을 그대로 파싱하게 만들 수 있다.

**교훈:** 헤더는 조기 거절용으로만 쓰고, 실제 본문을 읽은 뒤 UTF-8 바이트 수를 다시 확인한다.

## 보안·권한 경계

- 브라우저가 임의 명령·경로·플래그를 전달할 수 없다.
- POST는 정확한 same-origin만 허용한다.
- 관제탑은 brain 기존 파일을 수정하지 않는다. 정본 생성 규칙은 brain CLI의 UUID 고정 write-once 계약이 권위다.
- 인증·시크릿·스케줄러·배포·플랫폼 보관함 해제는 이번 변경에 포함하지 않는다.
- skill disposition은 후보 문서만 만들며 자동 설치하지 않는다.

## 검증

| 게이트 | 결과 |
|---|---|
| npm test | 18개 통과 |
| npm run typecheck | 통과 |
| npm run lint | 통과 |
| npm run build | 통과 — 기존 동적 파일 탐색으로 인한 Turbopack 추적 범위 경고 1건은 비차단 |
| brain 단위 테스트·빌드·문서 lint | 별도 brain 작업에서 검증 |
| 실제 플랫폼 보관함 변경 | 없음 |

## 남은 사람 게이트

- brain PR과 관제탑 PR의 검토·머지
- 실제 Telegram 봇 실행 및 인증 상태 확인
- Instagram 로그인 후 1→3→10 백필, Threads 추출 방식 결정
- 원본 플랫폼의 읽음·저장 해제 또는 공개 리포스트 취소
- 스케줄러·클라우드 릴레이 활성화

## 2026-07-31 실측 갱신

- Telegram 33건, X 북마크 10건, X 공개 리포스트 8건, YouTube 나중에 볼 동영상 98건을 dry-run → 1 → 3 → 10 → 전체 순서로 검증·적재했다. Telegram legacy 중 같은 message_id가 반복된 2건은 conflict로 남겨 기존 원문을 덮지 않았다.
- 최종 API와 브라우저 화면 모두 활성 149건, 반환 카드 149건, 완료/판단/보류/실패 0건을 표시했다. 플랫폼 카드 실측은 Telegram 33 / X 18 / YouTube 98이며 부분 표시 경고는 없었다.
- 영구 환경 파일은 건드리지 않고 검증 프로세스에만 YOHAN_OS_ROOT를 주입했다. 실제 실행 전에 .env.example을 참고해 PC별 YOHAN_OS_ROOT / YOHAN_REPOS_ROOT를 .env.local에 입력해야 한다.
- 원본 플랫폼 보관함·읽음·리포스트 상태와 Telegram 실봇은 변경하지 않았다.
