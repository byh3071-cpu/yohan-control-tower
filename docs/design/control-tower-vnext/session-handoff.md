# 요한 관제탑 디자인 세션 인수인계

- Handoff version: 1.3
- Prepared: 2026-08-24 (Asia/Seoul)
- Repository: `yohan-control-tower`
- Branch: `codex/control-tower-design-direction`
- Evidence baseline: verified working tree based on `46da6ea`
- Current direction: NOW-R3 approved · Goal 16 implemented and verified
- Production UI authorization: Goal 16 범위 완료 · 후속 화면은 새 사람 게이트 필요

## 현재 상태

- **선택 방향** — NOW-R3의 `한 화면 한 주인공`, `단계 → 목표 → 작업`, 조건부 이슈, 빈 메타 숨김을 사용자가 2026-08-24 승인함.
- **시각 언어** — Mova 밝은 중립 셸, 강한 단일 H1, 얇은 구분선, 제한된 청록 focus를 사용함.
- **기술 명세** — `CONTROL-TOWER-VNEXT-SPEC-R3.1`이 다섯 화면 책임과 단계별 구현 순서를 소유함.
- **구현 상태** — Goal 16에서 기존 5탭을 유지한 채 Home 진입을 `NowView`로 교체하고 실제 Goal·Completion Check를 연결함.
- **검증 범위** — 360·432·768·1280·1440px, live·multiple·empty·error·loading, 키보드, 대비, 경로 allowlist, typecheck·lint·test·build를 통과함. 정본은 `design-qa.md`임.
- **구현 경계** — Goal 16 밖의 `작업`, `지식·디자인`, `스킬·도구`, `운영 기록`, 전역 탐색명 전환은 아직 승인되지 않음.
- **VHK 상태** — npm 설치 가능 최신판 `2.14.0`. Goal 15·16은 DONE이고 Goal 13만 IN_PROGRESS임.

## 먼저 읽을 정본

1. `docs/design/control-tower-vnext/design-context.md`
2. `docs/design/control-tower-vnext/taste-profile.md`
3. `docs/design/control-tower-vnext/design-operations-manual.md`
4. `docs/design/control-tower-vnext/decision-log.md`
5. `docs/design/control-tower-vnext/work-item-language-contract.md`
6. `docs/design/control-tower-vnext/design-spec.md`
7. `docs/design/control-tower-vnext/now-screen-options.md`

최신 승인 시각·검증 근거는 `docs/prototypes/control-tower-now-mova-r3/`에 있다. 이전 Candidate A 검증은 기술 계보로만 보존한다.

## 사용자의 확인된 취향

- 한국어 중심, 익숙한 기술 용어 유지
- 뚜렷한 제목·부제·본문 위계와 여유 있는 행 리듬
- 3안의 아이콘·행 밀도, 2안의 단순한 골격·관계 표현
- 진한 검정 대신 Mova 밝은 중립 셸
- 실제 투명 벤더 아이콘, 파란 왼쪽 선택 엣지 제거
- 스킬·MCP·훅·에이전트마다 맞는 상세 구조
- 우측 검사는 간결한 관계·근거 중심, 전체 프롬프트 비노출
- 장식용 상태·근거 없는 수량·반복 버튼 제거
- 한국어 실제 이름을 우선하고 `PHASE / GOAL / TASK / NEXT`는 작은 분류 레이블로만 사용
- `Ticket`을 계층으로 만들지 않고 실제 외부 추적 기록만 `이슈`로 연결
- 값이 없는 이슈·담당자·기한·정의 카드는 영역 자체를 숨김

세부 금지 패턴과 대화 규칙은 `taste-profile.md`가 정본이다.

## 다음 한 가지 작업

다음 한 가지는 `design-spec.md` 권장 순서 2번인 `작업` 화면을 독립 구현 Goal로 분해하고 그 범위를 사람에게 승인받는 것이다.

다음 구현 Goal 후보:

> 기존 `할 일`, `일정`, `프로젝트` 기능을 삭제하지 않고 `작업` 화면의 세 형제 보기로 묶되, 각 보기의 완료 의미와 쓰기 경계를 유지한다.

이 Goal에는 `지식·디자인`, `스킬·도구`, `운영 기록`의 본문 구현이나 다섯 상위 탐색명 일괄 전환을 섞지 않는다. 새 Goal을 만들기 전 현재 사용 흐름과 쓰기 경계를 먼저 확인하고, 아직 없는 화면을 빈 탭으로 노출하지 않는다.

## 팀과 도구 운용

- 디자인 지휘·콘텐츠·기술·접근성·적대 검토: 현재 Codex 세션 + `design-team`
- 공식 용어 근거: GitHub·Jira·Linear 공식 문서
- 실제 시각 검증: Playwright + Windows Chromium
- 최종 방향 선택: 사용자

역할은 매번 전부 고용하지 않는다. 현재 결정에 필요한 최소 역할만 사용하고 결과를 지휘자가 합성한다.

## 새 세션 시작 프롬프트

```text
요한 관제탑 디자인 세션을 이어받아라. 승인된 NOW-R3와 완료된 Goal 16을 다시 열지 말고, 후속 화면은 새 Goal 범위가 승인되기 전 production UI를 수정하지 마라.

먼저 저장소 규칙과 현재 Git 상태를 확인하고, 아래 파일을 순서대로 읽어라.
- docs/design/control-tower-vnext/design-context.md
- docs/design/control-tower-vnext/taste-profile.md
- docs/design/control-tower-vnext/design-operations-manual.md
- docs/design/control-tower-vnext/session-handoff.md
- docs/design/control-tower-vnext/decision-log.md

Yohan Agent Kit의 최신 design-team 세션 연속성 계약을 적용한다. 시작 응답에는 반드시 ① 읽은 branch/ref ② 현재 승인 상태 ③ 바로 할 한 가지를 한국어로 짧게 되말해 수신을 확인하라.

NOW-R3와 해결된 취향을 다시 묻지 마라. Goal 16은 production 구현·QA까지 완료됐다. 다음 작업은 `작업`의 할 일·일정·프로젝트 형제 보기를 독립 Goal로 분해하고 범위를 사람에게 승인받는 것이다. R3의 54px Task H1을 모든 목록 화면에 기계적으로 복제하지 말고, `한 화면 한 주인공·표준 용어·빈 메타 숨김`만 공통 불변식으로 적용하라.
```

## 전달 영수증

| 단계 | 상태 | 근거 |
| --- | --- | --- |
| prepared | 완료 | NOW-R3 승인·Goal 16 구현·QA·VHK 2.14.0 검증·프로젝트 정본 묶음 |
| sent | 대기 | 새 독립 디자인 세션에 프롬프트 전송 필요 |
| acknowledged | 대기 | 대상 세션의 branch/ref·승인 상태·다음 행동 회신 필요 |
| current session closed | 대기 | 수신 확인과 최종 보고 뒤 종료 |

## 2026-08-23 Resource Guard 종료 영수증

- Guard: host commit 91.99%, current rollout 약 168MB.
- 조치: 추가 브라우저 반복·새 옵션·360px·production src·commit·push를 중단했다.
- Durable decision artifact: docs/design/control-tower-vnext/now-screen-options.md
- Visual source: docs/prototypes/control-tower-now-options/index.html
- Option A: docs/prototypes/control-tower-now-options/now-option-a-focus-runway-r1.png
- Option B: docs/prototypes/control-tower-now-options/now-option-b-decision-ledger-r1.png
- Option C: docs/prototypes/control-tower-now-options/now-option-c-exception-sweep-r1.png
- Verification: 세 PNG 1440×1024, overflow 0, visible text 최소 14px, console·page error 0.
- Historical gate: A/B/C 선택은 종료됐고 세 안 모두 기각됨. NOW-R3가 사용자 승인됨.
- Production UI authorization: 없음.
