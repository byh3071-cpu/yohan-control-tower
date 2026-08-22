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
