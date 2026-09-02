# 네 레인 시안 → Goal 25 인수인계

- 날짜: 2026-09-02 (Asia/Seoul)
- 상태: 기획 완료 · 코드 미착수 · 대화 컨텍스트 상한으로 세션 교대
- 저장소: `yohan-control-tower`
- 브랜치: `cursor/four-lane-sketches-2f80`
- HEAD: 이 파일이 있는 브랜치 최신 (`git rev-parse HEAD`). 기획 고정점은 `af8bbe81b1ad62b0b08ea3a29796726118ee57bf`
- PR: https://github.com/byh3071-cpu/yohan-control-tower/pull/40 (draft, base `master`)
- `.vhk/HARD_STOP`: 없음
- 라우팅: Goal 25는 **M** (3–6파일, 일정 시각). Goal 26은 그다음 **M**. 한 세션에 둘 다 넣지 마라.

## 새 세션이 할 일 (한 가지)

**Goal 25 — 일정 일상 표면 시각과 빠른 추가.**  
기존 `/api/calendar`에 시안 껍질을 입힌다. 스키마를 늘리지 않는다.

끝나면 `vhk goal check --id 25` → `vhk goal done --id 25` 뒤에만 Goal 26을 연다.

## 바로 읽을 파일 (이 순서)

1. `docs/operations/handoffs/2026-09-02-four-lanes-goal-25.md` (이 파일)
2. `docs/design/control-tower-vnext/four-lanes-implementation-spec.md`
3. `docs/adr/ADR-004-daily-surface-visual.md`
4. `goals/25-calendar-daily-visual.md`
5. `docs/prototypes/four-lanes/index.html` + `captures/screen-1.png`
6. `src/components/calendar-view.tsx` · `src/components/work-view.tsx` · `src/lib/types.ts` `CalendarItem`

`지금` NOW-R3, Goal 22·23 구현, 탭 5개 상한은 다시 설계하지 않는다.

## 이미 끝난 것

- 네 레인 HTML 시안: 일정 / 검토 / 인박스 / 문서. `서가`는 **문서**로 개명됨.
- 사용자 합의: 파스텔 캘린더가 이김. 인박스 이름 OK. 문서는 읽기 + `+ 새 기록`. 덮어쓰기 아님.
- 기획 문서·ADR-004·Goal 25·26 초안은 이 브랜치에 있음. 프로덕션 컴포넌트는 아직 NOW-R3/기존 UI.

## 하지 말 것

- Calendar `category` / 다가 span / 카테고리 점 줄 (원장 없음)
- 인박스 disposition → 일정 자동 생성
- brain 기존 파일 수정, 문서 인라인 에디터
- 상위 탭 개명(`지금`, `지식·디자인`), 6번째 탭
- 할 일 `일상 / 개발` 필터 (시안 없음, Goal 23 형제 유지)
- `지금` 화면 재색
- Pretendard CDN을 production에 넣기
- Goal 25와 26을 한 커밋에 섞기
- force push, `master` 직 push, 배포

## 구현 힌트 (Goal 25)

- 토큰 SoT: `src/lib/daily-visual.ts` 신규 + `[data-surface="daily"]`
- Work 형제 네비: 시안처럼 작은 라벨 + rose 밑줄. URL 계약은 Goal 23 유지
- 빠른 추가: 선택일 + 제목 Enter → `kind=task`. 빈 제목은 요청 금지
- pill 색은 `kind`만 (`event` cyan, `task` pink)
- 완료 PATCH는 Calendar만. Goal 완료와 동기화 금지
- 폰트: 기존 스택

## Goal 26은 25 DONE 뒤에만

- URL `view=docs&lane=review|inbox|files`
- 검토 리스트+상세, 인박스 던지기+분류(승격은 별도), 문서 읽기 + SoT 초안
- 시안 4폴더(`이력·지원` 등) 하드코딩 금지. 기존 `DocCategory`만

## 검증

명세의 게이트: typecheck · lint · test · build · `vhk goal check`.  
시각: 1440·768·360 overflow 0, 일정 H1은 선택일 하나.

## 붙여넣기용 시작 프롬프트

```text
요한 관제탑을 이어서 구현한다. 대화 기억 말고 Git 정본만 따른다.

브랜치: cursor/four-lane-sketches-2f80
PR: https://github.com/byh3071-cpu/yohan-control-tower/pull/40 (draft)
checkout 후 git log -1 과 이 인수인계 파일을 확인해라.

먼저 읽어라:
1. docs/operations/handoffs/2026-09-02-four-lanes-goal-25.md
2. docs/design/control-tower-vnext/four-lanes-implementation-spec.md
3. docs/adr/ADR-004-daily-surface-visual.md
4. goals/25-calendar-daily-visual.md

Phase: 일상 표면 입히기
Goal: 25 일정 시각과 빠른 추가
이번 Completion Check: daily-visual 토큰 + Calendar 빠른 추가(task) + 기존 calendar 테스트 회귀

시작 응답에 ① branch/HEAD ② Goal 25 NOT_STARTED ③ 바로 할 파일 목록을 한국어로 되말해라.
Goal 22·23·탭 구조·카테고리 스키마를 다시 열지 마라. 코드는 Goal 25만.
```
