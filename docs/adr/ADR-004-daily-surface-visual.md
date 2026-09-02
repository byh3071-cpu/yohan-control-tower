---
id: ADR-004
date: 2026-09-02
status: accepted
tags: [design, calendar, visual, daily-surface]
---

# ADR-004: 일상 표면은 캘린더 레퍼런스 파스텔을 쓰고 지금은 NOW-R3를 유지한다

## 맥락 (Context)

NOW-R3와 visual-hierarchy-contract는 앱 바탕 `#E7ECEE`, focus `#146C94`의 차가운 중립 셸을 승인했다. 이후 요한이 준 한국형 캘린더 레퍼런스는 흰 바탕, 파스텔 pill, 분홍 `+ 일정 추가`, 원형 체크다. 1차 네 레인 시안이 둘을 평균 내자 “밤티”로 기각됐다. 재시안은 레퍼런스를 이겼고, 사용자는 그 방향으로 기획·설계를 요청했다.

전역 셸을 파스텔로 바꾸면 `지금`의 작업 언어 승인과 충돌한다. 청록을 일정에도 유지하면 레퍼런스 UX가 다시 죽는다.

## 결정 (Decision)

- **일상 표면** = `작업`의 일정, `문서·검토`의 검토·인박스·문서. 토큰은 `src/lib/daily-visual.ts`와 `[data-surface="daily"]`. 강조는 rose `#f0a3b0`, 바탕은 `#ffffff`.
- **`지금`** = NOW-R3 불변식과 `#146C94` 유지. 이 ADR이 Home을 재시안하지 않는다.
- 상위 5탭 이름·순서는 바꾸지 않는다.
- 원장에 없는 장식(카테고리 점, 다가 막대, 서가 4폴더)을 그리지 않는다.
- Pretendard CDN은 시안 전용이다. production 글꼴은 기존 스택.

근거 시안: `docs/prototypes/four-lanes/`. 구현 범위: `docs/design/control-tower-vnext/four-lanes-implementation-spec.md`.

## 대안 (Alternatives)

1. **전 앱을 파스텔로** — `지금`의 승인된 작업 위계를 다시 연다. 기각.
2. **전 앱을 NOW-R3로** — 요한 캘린더 레퍼런스와 충돌. 이미 기각된 1차 시안과 같다.
3. **화면마다 새 팔레트** — 인지 부하. 기각.

## 결과 (Consequences)

- Goal 25·26은 `data-surface="daily"` 범위만 칠한다.
- 할 일·프로젝트 목록 본문은 이번 슬라이스에서 강제 재색하지 않는다. 형제 네비만 일정과 같은 문법으로 맞출 수 있다.
- 카테고리·문서 택소노미는 별도 원장 Goal이 필요하다.
