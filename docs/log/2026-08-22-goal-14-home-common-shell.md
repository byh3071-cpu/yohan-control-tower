# Goal 14 Home·공통 셸 구현 보고

- 날짜: 2026-08-22
- 브랜치: `byh3071-cpu/tower-workbench-20260822`
- 상태: 2026-08-23 재개 후 구현·격리 기능 검증·시각 QA 완료

## 한 줄

공통 셸 가림을 토큰으로 고정하고, Home을 빠른 담기 → 실제 인박스 최근 항목 → 컨텍스트 피크 한 화면으로 바꿨다.

## 변경 파일

| 파일 | 역할 |
| --- | --- |
| `src/app/page.tsx` | `h-dvh`, 홈 전용 독립 스크롤, 홈에서 햄버거 숨김 |
| `src/app/globals.css` | 헤더/탭 높이 토큰, reduced-motion |
| `src/components/header.tsx` | 44px 주요 동작, 홈에서 무의미한 햄버거 제거 |
| `src/components/view-tabs.tsx` | 탭 높이 토큰, 키보드 포커스, 5탭 유지 |
| `src/components/calendar-view.tsx` | Home 내부 Calendar 모드에서 주요 터치 타깃 44px 유지 |
| `src/components/home-view.tsx` | 공통 작업대 골격 |
| `src/components/home-quick-capture.tsx` | POST `/api/inbox` `enqueue` |
| `src/components/home-recent-inbox.tsx` | GET `/api/inbox` 최근 활성 목록 |
| `src/components/home-context-peek.tsx` | 공개 필드만 피크, 명시 행동 |
| `src/lib/home-inbox.ts` | 시간 정렬·선택·피크 순수 helper |
| `src/lib/home-inbox.test.ts` | mock 네트워크 포함 단위 테스트 |
| `design-qa.md` | Goal 13 증거 보존, Goal 14 섹션 추가 |

## 테스트

- typecheck 통과
- lint 오류 0건
- test 81/81 통과
- 실제 enqueue/승인/Brain 쓰기 없음
- build 통과 (기존 NFT 추적 경고 1건)
- 로컬 메모리 fixture로 1280×720, 390×844, dark, 담기→갱신→피크 검증 통과
- `vhk verify` 5/5와 Goal 14 게이트 통과 뒤 `vhk goal done --id 14` 완료
- commit / push / PR / release 하지 않음

## 남은 위험

- Next build의 기존 `next.config.ts` NFT 추적 경고는 성공 결과와 함께 남아 있다.
- 로컬 격리 fixture 검증이므로 실제 Brain/Calendar/인박스 원장 쓰기는 의도적으로 수행하지 않았다.
- 담기 직후 목록에 같은 id가 없으면 다른 항목으로 떨어지지 않고 대기 문구만 보여 준다

## 시각 QA

완료. `design-qa.md` Goal 14는 `passed`, P0 0 · P1 0 · P2 0이다.
