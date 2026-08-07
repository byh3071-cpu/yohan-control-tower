---
date: 2026-08-07
work: Calendar 일상 사용 MVP와 VHK 새 세션 표준화
branch: agent/control-tower-mvp
pull_request: 30
---

# Calendar 일상 사용 MVP

## 결과

Calendar가 생성·반복·발생일 완료 데모를 넘어 실제 일상 사용에 필요한 원본 수정, 충돌 방지, 확인 후 휴지통 이동, 즉시/목록 복구, 모바일 선택일 우선 화면까지 이어졌다. 영구 삭제와 외부 Calendar/PWA 알림은 넣지 않았다.

## Phase와 VHK Goal

| Phase | Goal | 결과 |
|---|---|---|
| A · 일상 편집 안전성 | Goal 5 | 일정·할 일 수정, 반복 전체 범위 안내, `expectedUpdatedAt` 충돌 409 |
| A · 저장 계약 | Goal 6 | `items/`→`trash/` 원문 byte-exact rename, 복구·traversal·ID 충돌 방어 |
| A · 사용자 흐름 | Goal 7 | 삭제 확인, 반복 전체 경고, 즉시 되돌리기, 휴지통 목록 복구 |
| B · 모바일 | Goal 8 | 390×844 선택일 패널 우선, 1440×900 기존 2열 유지 |
| C · 작업 연속성 | Goal 9 | 프로젝트 VHK 2.12.0 고정, 새 세션 Phase→Goal→Check 규칙, 로컬 점검·CORE-RULES 보호 |
| D · 출고 | Goal 10 | PRD·Architecture·ADR·계약 감사 동기화와 최종 게이트 |
| D · 인수인계 | Goal 11 | 모든 Goal 완료 시 stale next-task 보정과 새 세션 완료 snapshot |

## 구현 계약

- Calendar 종류와 ID·`created_at`은 수정해도 유지한다.
- 반복 규칙 수정 후 유효한 발생일의 `completed_dates`만 보존한다.
- 수정·삭제는 읽을 때 받은 `updated_at`과 현재 원본이 다르면 409로 거부한다.
- 삭제는 `unlink`가 아니라 Markdown 원문을 `trash/`로 rename한다.
- 복구 키는 엄격한 패턴으로 검증하고 활성 ID가 있으면 덮어쓰지 않는다.
- DELETE는 확인 Dialog의 최종 버튼을 누르기 전 전송하지 않고, 성공 응답 전 UI에서 낙관적으로 제거하지 않는다.

## 검증

- 단위·Route Handler 통합 테스트 `47/47` 통과.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` 통과.
- `verify:docs`는 격리 환경에 실제 Brain checkout이 없어 임시 `memory/` 외부 의존을 주입해 allowlist·traversal 계약을 검증하며, 집 PC의 실제 경로는 `npm run setup:check` 후 다시 실행한다.
- VHK `verify`: typecheck·lint·test·build·secure scan `5/5 PASS`.
- Goal 5 Playwright: 반복 일정 수정 후 새 제목 3건, 이전 제목 0건, 월간·목록 반영, 콘솔 오류 0.
- Goal 7 Playwright: 확인 전 DELETE 0회, 확인된 DELETE 2회, 즉시 복구와 휴지통 복구 후 활성 항목 각 1건, 콘솔 오류 0.
- Goal 8 Playwright: 모바일 선택일 패널 y=444.5~698.75로 스크롤 전 일정·할 일·수정·삭제가 표시되고, 데스크톱 격자 x=144·선택일 x=996의 2열을 유지했다.
- 1440×900·390×844 모두 body/document width가 viewport와 같아 가로 overflow 0.
- Playwright 스크린샷을 직접 확인해 Dialog 위계·간격·버튼 터치 영역·잘림을 검토했다.

## VHK 독푸딩

- 생성 `AGENTS.md`의 next-task append-only 지시와 `goal next` 덮어쓰기 모순을 재현해 [VHK #555](https://github.com/byh3071-cpu/vhk/issues/555)를 등록했다.
- 새 환경에서 `vhk sync`가 configured CORE-RULES v0.1.5를 번들 v0.1.0으로 경고 없이 낮추는 문제를 재현해 [VHK #556](https://github.com/byh3071-cpu/vhk/issues/556)을 등록했다.
- `vhk learn`이 개인 교훈을 담은 `memory.json.bak`을 Git 미제외 상태로 남기는 문제를 재현해 [VHK #557](https://github.com/byh3071-cpu/vhk/issues/557)을 등록하고 `.vhk/*.bak`을 제외했다.
- `vhk goal next`가 모든 Goal 완료를 출력하면서 마지막 `IN_PROGRESS` next-task를 남기는 문제를 재현해 [VHK #558](https://github.com/byh3071-cpu/vhk/issues/558)을 등록했다. 래퍼는 VHK 관리 snapshot만 명시적인 완료 snapshot으로 보정한다.
- 프로젝트 래퍼가 `.env.local`의 Brain core-ruleset을 자동 연결하고, 원본이 없으면 규칙 sync를 exit 1로 막는다. 차단 전후 CORE-RULES Git blob hash가 동일함을 확인했다.
- `receipt`의 dirty BLOCK과 `preflight`의 로컬 env BLOCK은 커밋 전·격리 환경의 정상 안전 차단으로 분류했다.

## 남은 경계

- 집 PC에서는 `.env.example`을 복사해 `.env.local`의 `YOHAN_OS_ROOT`, `YOHAN_REPOS_ROOT`, `YOHAN_CALENDAR_ROOT`를 실제 절대경로로 채운 뒤 `npm run setup:check`를 실행해야 한다.
- 휴지통 영구 삭제·보존 기간, PWA 설치·백그라운드 알림, Google·Apple·Outlook Calendar 양방향 동기화는 별도 Goal이다.
- Draft PR #30은 사람 검토 전 자동 병합하지 않는다.
