# 요한 관제탑 디자인 세션 인수인계

- Handoff version: 1.3
- Prepared: 2026-08-24 (Asia/Seoul)
- Repository: `yohan-control-tower`
- Branch: `codex/control-tower-design-direction`
- Evidence baseline: verified working tree based on `46da6ea`
- Current direction: NOW-R3 approved · 일상 표면 파스텔은 ADR-004
- Production UI authorization: Goal 22·23 완료. 네 레인 시안은 기획 승인(Goal 25·26)이며 코드 착수 전

## 현재 상태

- **선택 방향** — NOW-R3의 `한 화면 한 주인공`, `단계 → 목표 → 작업`, 조건부 이슈, 빈 메타 숨김을 사용자가 2026-08-24 승인함.
- **시각 언어** — `지금`은 NOW-R3 청록 중립. 일정·검토·인박스·문서는 ADR-004 파스텔.
- **기술 명세** — `CONTROL-TOWER-VNEXT-SPEC-R3.2` + `four-lanes-implementation-spec.md`
- **구현 상태** — Goal 22에서 기존 5탭을 유지한 채 Home 진입을 `NowView`로 교체하고 실제 Goal·Completion Check를 연결함.
- **검증 범위** — 360·432·768·1280·1440px, live·multiple·empty·error·loading, 키보드, 대비, 경로 allowlist, typecheck·lint·test·build를 통과함. 정본은 `design-qa.md`임.
- **구현 경계** — Goal 23은 완료. 다음 코드 Goal은 25(일정 시각)와 26(문서·검토 레인)이다. `지금` 재색, 5탭 개명, Calendar category 스키마, 할 일 일상/개발 필터는 승인되지 않음.
- **네 레인 명세** — `docs/design/control-tower-vnext/four-lanes-implementation-spec.md`
- **VHK 상태** — Goal 22·23·24 DONE. Goal 25·26 NOT_STARTED.

## 먼저 읽을 정본

1. `docs/design/control-tower-vnext/design-context.md`
2. `docs/design/control-tower-vnext/taste-profile.md`
3. `docs/design/control-tower-vnext/design-operations-manual.md`
4. `docs/design/control-tower-vnext/decision-log.md`
5. `docs/design/control-tower-vnext/work-item-language-contract.md`
6. `docs/design/control-tower-vnext/design-spec.md`
7. `docs/design/control-tower-vnext/four-lanes-implementation-spec.md`
8. `docs/adr/ADR-004-daily-surface-visual.md`
9. `docs/design/control-tower-vnext/now-screen-options.md`

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

다음 한 가지는 **Goal 25**다. 일정 화면에 시안 시각과 빠른 추가를 기존 Calendar API로 입힌다. Goal 26(검토·인박스·문서 레인)은 25 다음이다.

섞지 말 것: `지금` 재색, 5탭 개명, Calendar category, 할 일 일상/개발 필터, brain 파일 덮어쓰기.

## 팀과 도구 운용

- 디자인 지휘·콘텐츠·기술·접근성·적대 검토: 현재 Codex 세션 + `design-team`
- 공식 용어 근거: GitHub·Jira·Linear 공식 문서
- 실제 시각 검증: Playwright + Windows Chromium
- 최종 방향 선택: 사용자

역할은 매번 전부 고용하지 않는다. 현재 결정에 필요한 최소 역할만 사용하고 결과를 지휘자가 합성한다.

## 새 세션 시작 프롬프트

```text
요한 관제탑 디자인 세션을 이어받아라. NOW-R3와 Goal 22·23을 다시 열지 마라. 일상 표면은 ADR-004와 `four-lanes-implementation-spec.md`를 따른다. 바로 할 일은 Goal 25다.

먼저 저장소 규칙과 현재 Git 상태를 확인하고, 아래 파일을 순서대로 읽어라.
- docs/design/control-tower-vnext/design-context.md
- docs/design/control-tower-vnext/taste-profile.md
- docs/design/control-tower-vnext/design-operations-manual.md
- docs/design/control-tower-vnext/session-handoff.md
- docs/design/control-tower-vnext/decision-log.md

Yohan Agent Kit의 최신 design-team 세션 연속성 계약을 적용한다. 시작 응답에는 반드시 ① 읽은 branch/ref ② 현재 승인 상태 ③ 바로 할 한 가지를 한국어로 짧게 되말해 수신을 확인하라.

NOW-R3와 해결된 취향을 다시 묻지 마라. Goal 22·23은 완료다. 다음 코드는 Goal 25(일정 일상 표면)다. 카테고리 스키마와 탭 개명을 끼워 넣지 마라.
```

## 전달 영수증

| 단계 | 상태 | 근거 |
| --- | --- | --- |
| prepared | 완료 | NOW-R3 승인·Goal 22 구현·QA·VHK 2.14.0 검증·프로젝트 정본 묶음 |
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
- Production UI authorization: Goal 23 `작업` 형제 보기 범위만 있음.
