# 2026-08-22 관제탑 선택 시안 세부 설계

## 결과

- 사용자가 선택한 3안의 어두운 셸·밝은 작업면·명확한 아이콘을 기본 시각 방향으로 기록했다.
- 2안의 문서 근거·관계 표현을 결합하고, 우측 `작업 맥락`을 본문과 정렬된 360px 검사 열로 재설계했다.
- `design-team`의 구성 역할, 사용 스킬·도구, 참조 문서, 관계, 최근 근거, 다음 일정을 전체 프롬프트 없이 요약하는 계약을 만들었다.
- 문서 라이브러리·Design Intelligence·캘린더가 동일한 관계·역링크 모델을 사용하도록 명세했다.
- production UI 코드는 수정하지 않았다.

## 산출물

- `docs/design/control-tower-vnext/design-context.md`
- `docs/design/control-tower-vnext/decision-log.md`
- `docs/design/control-tower-vnext/design-spec.md`
- `docs/design/control-tower-vnext/relationship-model.md`
- `docs/design/control-tower-vnext/calendar-concept.md`
- 선택 시안 수정 미리보기: 내장 ImageGen 기본 생성 폴더의 `exec-569cce67-c9d9-4f47-90cf-d404eaa6c7d4.png`

미리보기 PNG는 아직 사람 승인 전이므로 프로젝트 정본으로 승격하지 않았다.

## 검토

- 1차 독립 검토: P0 없음, 설치·사용 상태, 자기참조, 1440 증거, 검사 열 확장 규칙 P1 발견.
- 보정: 설치 상태를 `미설치/설치됨`으로 분리하고 자기참조 제거, 사람 선택 관계 분리, 섹션별 노출 상한과 방향 확인용 viewport 고지 추가.
- 2차 독립 검토: 새 P0/P1 없음.
- `git diff --check`: 통과.
- `npm run verify:docs`: 최초 `YOHAN_OS_ROOT` 미설정으로 중단, 세션 범위 환경 변수로 Brain 경로를 제공한 재실행은 통과.

## 다음 사람 게이트

사용자가 수정 시안의 검사 열 밀도, 역할 표현, 문서·관계 흐름을 확인한다. 승인 뒤에만 구현 인수인계와 1440×1024 실측 UI 검증을 시작한다.

## 2차 보정 — 다중 화면 정보구조

- 사용자 피드백에 따라 깨진 생성 glyph를 폐기 대상으로 명시하고, 실제 구현은 Lucide named icon과 검증된 공식 브랜드 자산만 사용하도록 고정했다.
- `오늘 14:00`은 실제 일정이 아닌 이전 시안용 mock data였음을 기록했다. 자동화 자산에는 검증된 Calendar 관계가 있을 때만 `관련 검토` 역링크를 표시한다.
- 상위 탐색을 `지금 / 작업 / 지식·디자인 / 자동화 자산 / 운영 기록`으로 다시 제안했다. `작업`은 `할 일 / 일정 / 프로젝트`를 직접 선택 가능한 형제 보기로 제공한다.
- Agent Kit canonical catalog 197개와 12 kind를 확인했다. 네 facet은 탐색용 제안이며 raw kind는 보존한다.
- 작업, 자동화 자산, 지식·디자인의 세 화면군을 동일한 1487×1058 미리보기 조건으로 생성했다. 검사 열은 400px 기준으로 넓히고 관계는 두 줄 블록으로 분리했다.
- production UI 코드는 수정하지 않았고, 생성 PNG도 사람 승인 전이라 프로젝트 정본으로 승격하지 않았다.

### 추가 산출물

- `docs/design/control-tower-vnext/research-round-2.md`
- `docs/design/control-tower-vnext/surface-set-v2.md`
- 작업·할 일 미리보기: `exec-82e5e67f-add8-44a3-bf5e-4de2c59f3c56.png`
- 자동화 자산 미리보기: `exec-92074527-6650-4f4e-a4d5-a957c5f5d321.png`
- 지식·디자인 미리보기: `exec-07a74ee3-189f-4095-a136-184dad1c5120.png`

### 최종 검수 보정

- 독립 검토가 `작업` 하위 항목의 화면별 접힘, 주 명세의 구 용어, 상세 mock 값의 사실 오인 가능성을 P1 세 건으로 제기했다.
- 데스크톱의 `할 일 / 일정 / 프로젝트`를 모든 화면에서 항상 펼치고, 명세를 `catalog 단계 / 가용 상태 / 검증`과 `지식·디자인`으로 통일했다.
- 목록과 검사 열에 `예시 데이터` 경계를 지속 표시하도록 시안을 다시 생성했다. 실제로 검증된 197개와 facet 합계만 정본 수량으로 구분한다.
- 보정 뒤 독립 closure check 결과 P0/P1 잔존 없음.
- 최종 작업·할 일 미리보기: `exec-953d48a9-e3ad-4a3d-b09c-da3456af830c.png`
- 최종 자동화 자산 미리보기: `exec-38f16012-a09f-4c71-9ef3-f6cc1a0df09e.png`
- 최종 지식·디자인 미리보기: `exec-6bcac5f9-cf07-4e19-98c1-d1fe36a0a3ed.png`
