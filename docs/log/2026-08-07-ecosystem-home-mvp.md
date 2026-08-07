# 생태계 Home MVP — Draft 구현과 계약 감사

날짜: 2026-08-07  
Goal: `goals/2-ecosystem-home-mvp.md`  
상태: BLOCKED — 코드 품질 게이트 통과, 실제 브라우저 QA와 v1.1 선행 계약 확인 미완료

## 배경

관제탑을 사람의 단일 진입점으로 두고, Work·Knowledge·VHK/MCP/Skills·Finance의 상태를 한 화면에서 훑는 빠른 MVP가 필요했다. 기존 탭을 늘려 복잡성을 재생산하지 않고 PRD가 예약한 마지막 다섯 번째 `Home` 탭을 사용했다.

## 구현

- 기본 진입을 Home으로 변경하고 탭을 `홈 · 프로젝트 · 문서 · 기록 · 벡터` 5개에서 동결했다.
- `/api/todos`의 실제 미완료 항목 중 우선순위가 높은 3건을 Home에 표시한다.
- 문서, 결정, 규칙, 템플릿, 인제스트 집계는 기존 대시보드 응답을 재사용한다.
- 빠른 메모와 승인 큐는 기존 문서 인박스로 연결한다.
- 캘린더, 재무, 공통 AI 실행 추적은 숫자를 만들지 않고 연결 대기·설계 대기로 표시한다.
- Brain 연결 실패와 Todo 스캔 실패가 `0건`처럼 보이지 않게 별도 오류 상태를 추가했다.
- Notion 50 + Linear 30 + Craft 20 방향에 맞춰 Warm Cream, Ink, Orange 토큰과 낮은 카드 밀도를 적용했다.

## 함께 해결한 기반 결함

- `@qdrant/js-client-rest` 1.18에서 제거된 `search` 호출을 통합 `query` API로 교체했다.
- 누락된 optional dependency가 있어 새 클론에서 `npm ci`가 실패하던 lockfile을 정상화했다.
- Goal 2를 VHK가 인식하도록 필수 frontmatter와 닫힌 status 값을 적용했다.

## 계약 감사

`VISION.md`, `RULES.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, 과거 역할 분리 합의를 대조했다. 상세 결과는 `docs/ECOSYSTEM-CONTRACT-AUDIT.md`에 기록했다.

병합 차단 항목:

1. brain의 `ecosystem-contract.yaml` 개정 및 inheritance registry 변경 확인
2. v1.1 미션 taxonomy인 `projects.yaml` 정본화 확인
3. 일정/할일 DB와 `<repo>/goals/*.md` 사이의 Task SoT 단일화
4. 실제 데스크톱·모바일 브라우저 시각 QA

## 검증

- `NPM_CONFIG_CACHE=/tmp/yohan-ct-npm-cache npm ci` — 통과, 805 packages
- `git diff --check` — 통과
- `npm run typecheck` — 통과
- `npm run lint` — 통과
- `node --import tsx --test ...` — 21/21 통과
- `npm run build` — 통과, 21개 정적 페이지 생성. 기존 NFT trace 경고 1건은 남음.

기본 `npm test`의 `tsx` CLI는 현재 샌드박스에서 IPC 소켓 생성이 거부돼 실행되지 않았다. 동일한 네 개 테스트 파일을 Node의 `--import tsx --test` 경로로 실행해 전부 통과시켰다.

## 시각 검증 상태

브라우저 제어 환경에서 로컬 주소 접근이 차단됐고, 공식 에이전트 미리보기는 현재 Next.js `dev` 스크립트와 Vite 전용 전달 인자가 맞지 않아 시작되지 않았다. 미리보기를 위해 Next.js를 Vite/Vinext로 교체하는 것은 범위와 아키텍처를 훼손하므로 중단했다. 따라서 반응형·접근성은 코드와 빌드 기준으로만 확인됐으며 실제 픽셀 검증은 미완료다.

## 다음 세션 인계

1. GitHub 쓰기 권한이 있는 환경에서 `agent/control-tower-mvp` 브랜치를 push하고 Draft PR을 연다.
2. Draft PR 체크아웃 후 `YOHAN_OS_ROOT`를 실제 brain에 연결한다.
3. 데스크톱 1440×900, 모바일 390×844에서 Home 첫 화면, 프로젝트 이동, 문서 이동, 빠른 메모/승인 큐를 확인한다.
4. 계약 감사의 P0 세 항목을 승인·정본화한다.
5. F004 읽기 전용 미션 집계를 구현해 Home의 임시 생태계 카드를 실제 미션 데이터로 교체한다.

## 원격 게시 상태

로컬 커밋은 생성했지만 연결된 GitHub App이 브랜치 생성에 `403 Resource not accessible by integration`을 반환했고, 이 환경의 Git remote에도 사용자 인증이 없어 push가 중단됐다. 변경은 로컬 브랜치와 별도 `git format-patch` 파일로 보존한다.

## Notion Dev Log

이번 세션에서는 GitHub Draft MVP 생성만 승인 범위로 보아 외부 Notion DB에는 쓰지 않았다. 다음 세션에서 `바이브코딩 Dev Log`의 대상 DB와 SoT Key를 확인한 뒤 중복 없이 1행 적재한다.
