# 요한 관제탑 디자인 세션 인수인계

- Handoff version: 1.0
- Prepared: 2026-08-23 (Asia/Seoul)
- Repository: `yohan-control-tower`
- Branch: `codex/control-tower-design-direction`
- Evidence baseline: `861c856`
- Current direction: Candidate A
- Production UI authorization: 없음

## 현재 상태

- **기술 검증** — Candidate A browser QA 178/178 통과.
- **적대 검수** — Claude Code 최종 검수에서 새 P0/P1 없음.
- **시각 방향** — 2안의 간결한 골격·관계 표현과 3안의 행 밀도·아이콘을 Mova 밝은 중립 셸로 결합.
- **사용자 승인** — 공통 시각 기반은 선택됐지만 목록 밀도, 검사 열 정보 순서, 반복 상태의 최종 미감 승인은 아직 없음.
- **구현 경계** — production `src` 수정은 승인되지 않음.
- **세션 전달** — 문서 준비 완료, 새 세션 수신 확인 대기.

## 먼저 읽을 정본

1. `docs/design/control-tower-vnext/design-context.md`
2. `docs/design/control-tower-vnext/taste-profile.md`
3. `docs/design/control-tower-vnext/design-operations-manual.md`
4. `docs/design/control-tower-vnext/decision-log.md`
5. `docs/design/control-tower-vnext/design-spec.md`
6. `docs/prototypes/control-tower-asset-validation/design-qa.md`
7. `docs/log/2026-08-23-control-tower-design-and-orca-investigation.md`

최신 시각·검증 근거는 `docs/prototypes/control-tower-asset-validation/`에 있다.

## 사용자의 확인된 취향

- 한국어 중심, 익숙한 기술 용어 유지
- 뚜렷한 제목·부제·본문 위계와 여유 있는 행 리듬
- 3안의 아이콘·행 밀도, 2안의 단순한 골격·관계 표현
- 진한 검정 대신 Mova 밝은 중립 셸
- 실제 투명 벤더 아이콘, 파란 왼쪽 선택 엣지 제거
- 스킬·MCP·훅·에이전트마다 맞는 상세 구조
- 우측 검사는 간결한 관계·근거 중심, 전체 프롬프트 비노출
- 장식용 상태·근거 없는 수량·반복 버튼 제거

세부 금지 패턴과 대화 규칙은 `taste-profile.md`가 정본이다.

## 다음 한 가지 작업

`지금` 화면의 정보 구조만 검토한다. 다른 화면을 동시에 완성하지 않는다.

1. `지금` 화면이 답할 한 문장을 사용자와 확인한다.
2. 현재 Home 요소를 `항상 필요 / 가끔 필요 / 기본 화면에는 불필요`로 나눈다.
3. Candidate A의 셸·타입·아이콘 규칙은 유지하고, 1440px 기준 정보 구조가 다른 세 대안을 만든다. 색만 바꾼 변형은 금지한다.
4. 모든 시안은 채팅 렌더와 프로젝트 상대경로를 함께 제공해 실제 표시를 확인한다.
5. 사용자가 한 방향을 고른 뒤에만 해당 방향의 360px 상태를 만든다.

첫 결정 질문은 다음과 같이 좁힌다.

> `지금` 화면에서 가장 먼저 답해야 하는 문장을 “지금 이어갈 일”, “내 승인이 필요한 일”, “막힌 일” 중 무엇을 중심으로 합칠지, 실제 세 구조를 보고 하나씩 정하겠습니다.

## 팀과 도구 운용

- 디자인 지휘자: GPT-5.6 Sol xhigh — 사용자 대화, 방향 합성, 승인 상태 관리
- UX·제품 기획: 필요할 때 Terra — 작업 흐름과 정보 구조 검토
- 레퍼런스 조사: 필요할 때 Luna — 검증 가능한 공식·원본 자료 수집
- 비주얼 디자인: Sol + 내장 ImageGen — 실제 렌더 제작
- 기술 설계: 필요할 때 Terra — Next.js/React 데이터 계약과 구현 가능성
- 적대 검토: 다른 벤더 또는 독립 검수자 — read-only P0/P1 검토

역할은 매번 전부 고용하지 않는다. 현재 결정에 필요한 최소 역할만 사용하고 결과를 지휘자가 합성한다.

## 새 세션 시작 프롬프트

```text
요한 관제탑 디자인 세션을 이어받아라. production UI는 수정하지 말고 디자인 조사·시안·토큰·UX·기술 명세만 다룬다.

먼저 저장소 규칙과 현재 Git 상태를 확인하고, 아래 파일을 순서대로 읽어라.
- docs/design/control-tower-vnext/design-context.md
- docs/design/control-tower-vnext/taste-profile.md
- docs/design/control-tower-vnext/design-operations-manual.md
- docs/design/control-tower-vnext/session-handoff.md
- docs/design/control-tower-vnext/decision-log.md

Yohan Agent Kit의 최신 design-team 세션 연속성 계약을 적용한다. 시작 응답에는 반드시 ① 읽은 branch/ref ② 현재 승인 상태 ③ 바로 할 한 가지를 한국어로 짧게 되말해 수신을 확인하라.

이미 선택된 Candidate A와 해결된 취향을 다시 묻지 마라. 다음 작업은 `지금` 화면의 정보 구조 세 대안이며, 한 번에 중요한 결정 하나만 사용자와 티키타카한다. 이미지가 실제로 보이는지 확인하고 프로젝트 상대경로를 함께 남겨라. 사용자의 `ㅇㅇ/ㄱㄱ/계속`은 바로 앞 작업 진행 신호이지 최종 디자인 또는 production 구현 승인이 아니다.
```

## 전달 영수증

| 단계 | 상태 | 근거 |
| --- | --- | --- |
| prepared | 완료 | 이 문서와 프로젝트 정본 묶음 |
| sent | 대기 | 새 독립 디자인 세션에 프롬프트 전송 필요 |
| acknowledged | 대기 | 대상 세션의 branch/ref·승인 상태·다음 행동 회신 필요 |
| current session closed | 대기 | 수신 확인과 최종 보고 뒤 종료 |
