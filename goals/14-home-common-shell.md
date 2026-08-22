---
vhk_format: 1
type: goal
id: 14
title: 채택 시안 기반 Home·공통 셸
status: NOT_STARTED
priority: P0
---

# Goal 14: 채택 시안 기반 Home·공통 셸

## Objective

승인된 Yohan Control Tower 시안의 정보 위계와 여백을 공통 셸·Home에 적용하고, 한 화면에서 빠른 담기→최근 항목→컨텍스트 피크→명시적 행동까지 이어지는 실제 작업 흐름을 완성한다.

## Scope

- 상단 바·5탭 내비게이션·페이지 제목의 높이와 스크롤 경계를 고정해 본문 가림을 없앤다.
- Home은 "지금 뭐 하나"에 답하는 한 화면으로 유지하고, 장식성 상태·중복 메타를 줄인다.
- 빠른 담기 뒤 최근 항목이 실제 원장에서 갱신되는 흐름을 연결한다.
- 최근 항목에서 짧은 컨텍스트를 확인하고, 명시적인 다음 행동으로 이동한다.
- 기존 디자인 토큰과 Lucide 아이콘만 사용하며 승인된 시안의 따뜻한 중립색·얇은 경계·강한 타이포 위계를 따른다.

## Completion Check

- [ ] 1280px와 390px에서 상단 바·제목·주요 버튼이 잘리거나 서로 가리지 않는다.
- [ ] Home의 제목·부제목·핵심 행동·보조 메타가 첫 시야에서 명확한 강약을 가진다.
- [ ] 빠른 담기→최근 항목 갱신→컨텍스트 피크→명시적 행동의 핵심 경로가 실제 데이터로 작동한다.
- [ ] 탭은 5개 상한을 유지하고 키보드 포커스·44px 주요 동작·reduced-motion을 확인한다.
- [ ] `design-qa.md`가 `final result: passed`이고 P0·P1·P2가 모두 0건이다.
- [ ] typecheck·lint·test·build·VHK policy·비밀값 검사가 통과한다.

## Forbidden

- 기존 Brain 파일 수정 또는 사람 승인 없는 상태 변경
- 탭 추가, Home의 다중 화면화, 자동 실행·자동 승인
- 텍스트 기호·이모지·수제 SVG로 아이콘 대체
- main 직접 push, PR merge, 배포

## Evidence

- 승인 시안: Yohan Brain 디자인 인텔리전스의 Control Tower context-peek 채택 캡처
- 구현 코드·상태 테스트·데스크톱/모바일/다크 캡처
- 독립 시각 검수와 타벤더 적대검수 영수증
