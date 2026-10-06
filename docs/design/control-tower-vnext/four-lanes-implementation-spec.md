# 네 레인 시안 — 구현 명세

- Status: ready for Goal 25·26 · production 미착수
- Date: 2026-09-02
- Visual SoT: `docs/prototypes/four-lanes/index.html` + `captures/screen-1.png`–`screen-4.png`
- Visual ADR: `docs/adr/ADR-004-daily-surface-visual.md`
- Human gate: 이 문서는 구현 Goal의 범위다. `ㅇㅋ`는 시안 방향 합의이지 배포 승인이 아니다.

## 한 줄

폰에서 던지고, 집 PC에서 분류하고, 일정은 캘린더처럼 고치고, 지식은 한 번 승인하고, 문서는 다시 연다. 노션처럼 모든 화면에서 본문을 덮어쓰지 않는다.

## 시안이 가리키는 네 화면

| 시안 | 제품 위치 | 주인공 | 쓰기 |
| --- | --- | --- | --- |
| 일정 `?v=cal` | `작업` → 일정 | 이번 달과 선택일 | Calendar 원장 CRUD |
| 지식 검토 `?v=review` | `문서·검토` → 검토 | 승인 대기 1건 | 결정만. Brain은 신규 파일 |
| 인박스 `?v=inbox` | `문서·검토` → 인박스 | 분류할 1건 | 큐 결정. 원본 SNS는 안 고침 |
| 문서 `?v=shelf` | `문서·검토` → 문서 | 다시 여는 기록 1건 | 신규 파일만. 기존 brain 금지 |

상위 탭 5개는 바꾸지 않는다. 제품 라벨은 그대로 `홈 / 작업 / 문서·검토 / 기록 / 벡터`다. 시안의 `지금 / 지식·디자인`은 미래 이름이며 이번 구현에서 탭을 개명하지 않는다.

## 불변식

1. 탭 6개 금지. 지식 세 화면은 `문서·검토` 안의 형제 레이다.
2. Calendar task 완료 ≠ Goal 완료. 동기화하지 않는다.
3. 에이전트는 일정을 자동 생성하지 않는다. 인박스 `할 일 → 캘린더`는 분류값만 남긴다.
4. 기존 brain 파일 수정 금지. 승인·승격·SoT 초안은 **새 경로만**.
5. 가짜 UI 금지. 원장에 없는 카테고리 점·다가 일정 막대·문서 폴더 4칸을 그리지 않는다.
6. `지금` 화면은 NOW-R3 청록 셸을 유지한다. 파스텔은 일상 표면만.

## 시각 토큰 (일상 표면)

구현은 하드코딩 hex 나열이 아니라 `src/lib/daily-visual.ts` 한 곳 + CSS 변수 `[data-surface="daily"]`에 둔다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--daily-bg` | `#ffffff` | 화면 바탕 |
| `--daily-ink` | `#2a2a2a` | 본문 |
| `--daily-muted` | `#9a9692` | 보조 |
| `--daily-line` | `#eeeae6` | 1px 경계 |
| `--daily-rose` | `#f0a3b0` | 강조 채움·활성 밑줄 |
| `--daily-rose-deep` | `#e07a8c` | 선택 숫자·타임스탬프 |
| `--daily-rose-fill` | `#fde8ec` | 선택 행·`+ 추가` 배경 |
| pill 파스텔 | `#f7d5dc` `#cfe6f4` `#c8e8ee` `#d4eadc` `#e3daf3` `#f6dfd0` `#eee8e0` `#ebe8e4` | Calendar `kind` 표시 전용 |

- 글꼴: 기존 앱 스택. Pretendard CDN을 production에 넣지 않는다.
- 굵기: 400 / 600 / 700.
- H1: 화면당 하나. 일정은 선택일(`9월 27일 일요일`)이 H1, 월 표기는 툴바.
- 주요 행동 하나: 일정 `+ 일정 추가`, 검토 `승인하고 저장`, 인박스 분류의 첫 버튼이 아니라 **선택 항목의 다음 허용 행동 하나**, 문서 `+ 새 기록`.
- 원형 체크 18px, 완료는 rose 채움 + 흰 체크 + 취소선. 상태는 텍스트/취소선을 함께 쓴다.
- 1280px+: 본문 + 우측 320–340px. 767px 이하: 선택일·분류·미리보기가 먼저, 격자와 목록은 아래 또는 전체 화면.

## 화면 계약

### 1. 일정 — Goal 25

**픽셀 기준:** `captures/screen-1.png`.  
**코드:** `src/components/calendar-view.tsx`, `src/components/work-view.tsx` 형제 네비.  
**API:** 기존 `/api/calendar`만. 필드 추가 없음.

| UI | 동작 |
| --- | --- |
| 형제 `할 일 / 일정 / 프로젝트` | 기존 Work URL. 시안처럼 작은 텍스트 + rose 밑줄 |
| `오늘` `<` `>` | 기존 월/일 이동 |
| `ALL` | 기존 월간/목록 전환을 이 자리에 둔다. 카테고리 필터가 아니다 |
| `+ 일정 추가` | 기존 생성 dialog. rose-fill pill |
| 월간 격자 | 월 시작 월요일 유지. 날짜 셀에 당일 occurrence pill |
| pill 색 | `kind=event` cyan/blue, `kind=task` pink. 그 외 sand. **카테고리 필드 없음** |
| 선택일 | 분홍 라운드 테두리. 우측 패널 H1 = 선택일 |
| 우측 목록 | 그날 event는 왼쪽 4px accent, task는 원형 체크. 완료 PATCH는 Calendar만 |
| 빠른 추가 | 선택일 + 제목 Enter → `kind=task` 생성. 빈 제목 거부 |
| 수정·휴지통 | 기존 dialog·409 `expectedUpdatedAt` 유지 |

**이번 Goal에서 그리지 않음:** 카테고리 점 줄, 여러 날 span pill, 가짜 ALL 카테고리 필터.

**상태:** loading / error / empty 월 / 선택일 0건 / 409 충돌. 색만으로 상태를 말하지 않는다.

**모바일:** 기존 선택일 agenda 우선을 유지하고 FAB `+`는 생성 dialog와 같은 행동이다.

### 2. 지식 형제 레인 — Goal 26

**코드:** `src/app/page.tsx`의 인박스 토글·카드/표/관계를 **레인이 문서일 때만** 하위 보기로 남긴다.  
**새 모듈:** `src/lib/knowledge-navigation.ts` (work-navigation과 같은 allowlist 패턴).

URL:

```
view=docs&lane=review|inbox|files
```

- 기본 `lane=files`.
- `lane` allowlist 실패 시 `files`로 canonicalize하고 잘못된 값은 URL에서 제거.
- 새로고침·뒤로 가기 복원.
- `docsMode=card|table|graph`는 `lane=files`에서만 유효. 다른 레인이면 무시.

형제 라벨: `검토 / 인박스 / 문서`. 시안 밑줄 rose.

#### 검토

**픽셀:** `captures/screen-2.png`.  
**코드:** `src/components/knowledge-review-panel.tsx`.  
**API:** 기존 `GET|POST /api/knowledge-review`.

| 시안 버튼 | API |
| --- | --- |
| 승인하고 저장 | `approve` — `approvalReady`가 아니면 disabled |
| 보류 | `hold` |
| 거절 | `reject` |
| (상세 안) | `approve_after_edit`는 메모가 있을 때만. 시안 1열에 올리지 않음 |
| (상세 안) | `reprocess_required`는 차단 사유가 있을 때만 |

좌측 목록 + 우측 SUMMARY. 주인공은 선택 항목 제목. 타임스탬프는 `claims[].timestamp`가 있을 때만 찍는다. 없으면 행을 만들지 않는다.

Brain 쓰기는 기존 승인 경로만. 재승인은 hash 불변.

#### 인박스

**픽셀:** `captures/screen-3.png`.  
**코드:** `src/components/yohan-inbox-panel.tsx`.  
**API:** 기존 `/api/inbox`. same-origin 유지.

던지기(위쪽 pill 입력): 기존 capture. 텔레그램 수집은 그대로 백그라운드.

분류 버튼은 **disposition 결정**이다. 승격은 별도 확인 버튼으로 남긴다(ADR-001).

| 시안 | `InboxDisposition` | 부수 효과 |
| --- | --- | --- |
| 지식 후보 → Focus Feed | `knowledge` | 캘린더·Brain 파일 생성 없음 |
| 할 일 → 캘린더 | `action` | 일정 항목 자동 생성 없음 |
| 참고만 | `reference` | 없음 |
| 중복 / 삭제 | `duplicate` 또는 `reject` | 확인 뒤에만. 한 버튼에 두 값을  silently 합치지 말 것 — 기본은 확인 메뉴 |

`skill` / `unrecoverable`은 상세에만 둔다. 시안 4버튼에 억지로 끼우지 않는다.

원문 SNS 편집 UI 없음.

#### 문서

**픽셀:** `captures/screen-4.png`.  
**코드:** 기존 사이드바 분류 + `doc-preview.tsx`.  
**쓰기:** `SotDraftPanel`을 `+ 새 기록`으로 연다. 저장은 `POST /api/sot-draft` 신규 경로. 존재하면 409.

미리보기는 읽기 전용. 연필로 본문 저장하는 컨트롤을 만들지 않는다.

**그리지 않음:** `이력·지원 / 자기이해 / 상담·검사 / 강의 전사` 4폴더. 현재 `DocCategory`는 insights·rss·url·wiki·curriculum·projects·decisions·rules·templates다. 사이드바는 이 분류를 시안 점 문법으로만 다시 칠한다.

카드/표/관계는 `lane=files`의 보기 전환으로 유지한다. 6번째 탭이 아니다.

## 개발 할 일 · 일상 할 일 · 프로젝트

이번 명세 밖이다. 이미 `작업` 형제로 구현됨(Goal 23).

- 일상 추가는 **일정**에서 한다.
- 개발 진행 정본은 **프로젝트** Goal이다.
- 할 일의 `일상 / 개발` 필터는 시안이 없으므로 구현하지 않는다.

## 구현 순서

1. **Goal 25** 일정 시각 + 빠른 추가. 동작 회귀 없이 껍질.
2. **Goal 26** `lane` URL + 검토·인박스·문서 배치. API 계약 불변.

한 Goal에서 탭 이름·벡터·지금 화면·Calendar 스키마를 함께 바꾸지 않는다.

## 파일 매핑

| 신규/변경 | 책임 |
| --- | --- |
| `src/lib/daily-visual.ts` | 토큰 SoT. 컴포넌트는 여기만 import |
| `src/app/globals.css` | `[data-surface="daily"]` 변수 |
| `src/components/work-view.tsx` | 형제 네비 시각. 데이터 소유 금지 |
| `src/components/calendar-view.tsx` | 격자·선택일·빠른 추가 |
| `src/lib/knowledge-navigation.ts` | `lane` parse/serialize/canonicalize |
| `src/app/page.tsx` | docs 레인 전환. 인박스 오버레이 제거 |
| `src/components/knowledge-review-panel.tsx` | 리스트+상세 |
| `src/components/yohan-inbox-panel.tsx` | 던지기 + 분류 열 |
| `src/components/sot-draft-panel.tsx` | `+ 새 기록` 진입 |

## 검증

- 단위: Calendar 생성 payload, knowledge `lane` allowlist, 인박스 4버튼 → disposition 닫힌집합.
- 라우트: 기존 calendar·inbox·knowledge-review·sot-draft 테스트 회귀 0 허용 실패.
- 시각: 1440·768·360에서 overflow 0, H1 1개, 44px 표적.
- 보안: inbox POST same-origin, sot-draft 존재 시 409, 절대경로·시크릿 0.
- 게이트: typecheck · lint · test · build · `vhk goal check`.

## 범위 밖 (다음 사람 게이트)

- Calendar `category` 필드, 다가 일정, 카테고리 점 필터
- 문서 인간 폴더 택소노미
- 할 일 `일상 / 개발` 필터 시안
- 상위 탭 개명 (`지금`, `지식·디자인`)
- Pretendard 파일 내장
- 인박스 → 캘린더 자동 생성
- brain 기존 파일 편집기
