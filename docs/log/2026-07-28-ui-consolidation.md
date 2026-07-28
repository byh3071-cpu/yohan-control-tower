---
날짜: 2026-07-28
작업: UI 4탭 재편 + 이관 제외 7파일 삭제 + lint 부채 해소 (Phase 3)
브랜치: feat/control-tower-unification
관련: docs/ARCHITECTURE.md §2 · docs/PRD.md F008·F010 · ADR-012
---

# UI 통합 — 6탭에서 4탭으로

## 한 일

이관해온 화면을 요한이 실제로 쓸 모양으로 줄였다. 탭 6개를 4개로 재편하고, 어떤 기능ID에도 안 붙던 7파일을 지우고, 이관이 드러낸 lint 8건을 없앴다.

**탭 재편** — `docs·todo·charts·timeline·workroom·constellation` 6개를 `프로젝트·문서·기록·벡터` 4개로 만들었다. 늘린 게 아니라 흡수했다.

| 사라진 탭 | 어디로 |
|---|---|
| todo | 프로젝트 탭 본문 |
| charts | 기록 탭 안 |
| timeline | 기록 탭 안 |
| workroom | 인박스는 문서 탭 토글, 상태카드는 기록 탭 |
| constellation | 문서 탭의 **표시 모드**(카드/표/관계) |

여기에 벡터를 신규 흡수해서 4개다. v1.1 에 홈 하나만 더해 5에서 동결한다.

**벡터 화면 단일 소유자** — `src/app/vector/page.tsx` 의 본문을 `src/components/vector/VectorPanel.tsx` 로 뽑았다. 독립 주소 `/vector` 와 벡터 탭이 같은 컴포넌트를 렌더한다. 어느 한쪽에만 두면 다른 쪽이 빈 껍데기가 되거나 코드가 둘로 갈라진다.

**삭제 7파일** — `api/briefing`+`briefing-card` · `api/nlp-command` · `serendipity-card` · `mini-charts`(이미 미사용) · `api/vector-status`+`vector-status-card`(이 레포 `api/vector/status` 와 중복 소유).

**팔레트 재배선** — ⌘K 팔레트의 유일한 fetch 가 방금 지운 `/api/nlp-command` 였다. `/api/search` 로 옮기면서 자연어 의도 파싱을 되살리지 않고 잘라냈다.

## 판단 3개

### 자연어 명령 실행은 복구하지 않았다

구 팔레트는 자연어를 `search_docs`·`run_action`·`open_view` 로 분류해 **뷰 전환과 명령 실행까지** 했다. 재배선하면서 검색만 남겼다.

뷰 전환은 탭 클릭이 더 빠르고, `open_view` 가 알던 5개 뷰 중 4개는 탭 지위를 잃었다. 명령 실행은 더 분명하다 — 오분류 한 번이 곧 실행이고, 그건 F010 의 사람 게이트와 정면으로 충돌한다. AI 의 몫은 검색 하나로 좁혔다.

### 위험 명령 2건을 UI 에서도 뺐다 (F010 판정 완료)

`git:sync`(= `git pull && git push`)와 `sync:notion:push` 는 서버가 `humanGate` 로 403 을 준다. 그런데 사이드바와 팔레트에는 여전히 버튼이 떠 있었다 — **누르면 반드시 실패하는 버튼**이다.

PRD 가 "오너 승인 전 비노출"로 적어둔 항목이라 목록에서 뺐다. 서버 403 은 그대로 둔다. UI 를 안 띄우는 것과 서버가 거부하는 것은 각각 다른 걸 막는다 — 앞은 오조작, 뒤는 다른 클라이언트의 직접 호출이다.

### 카드를 지우면 백엔드가 죽은 코드로 남는다

`serendipity-card.tsx` 하나만 지웠더니 `pickSerendipity`(+`dayHash`)·`SerendipityDoc` 타입·`api/docs` 응답 필드가 소비자 0인 채 3파일에 남았다. 컴파일도 되고 테스트도 통과한다 — 아무도 안 부를 뿐이다.

**UI 를 지울 때는 그 UI 만 쓰던 백엔드를 함께 봐야 한다.** 남겨두면 다음 사람이 "쓰이는 코드"로 읽는다. 셋 다 제거했다.

## lint 8건 — 이관이 만든 게 아니라 드러낸 부채

`eslint-config-next` 16.2.8+ 가 `react-hooks/set-state-in-effect` 를 강화했다. brain/dashboard(16.2.7)에서는 통과하던 코드다. 규칙 자체가 React 19 공식 권장이라 회피하지 않고 고쳤다.

삭제로 4건이 소멸하고 4건이 남았는데, 원인이 두 종류였다.

**데이터 페칭 3건**(`page.tsx`·`overnight-status-card`·`publish-status-card`) — effect 본문에서 `fetchStatus()` 를 직접 부르는 형태. `setTimeout(…, 0)` 으로 감싸 setState 가 타이머 콜백 안에서만 일어나게 했다. 벡터 패널이 이미 쓰던 패턴이라 셋을 같은 모양으로 맞췄다.

**팔레트 상태 리셋 1건** — 닫힐 때 검색어를 비우려고 `useEffect(() => { if (!open) setQuery("") }, [open])` 를 쓰고 있었다. 이건 규칙이 정당하게 잡는 경우다. effect 를 지우고 부모에서 `key={cmdOpen ? "cmd-open" : "cmd-closed"}` 로 **리마운트**해서 초기화한다. 닫힘이 곧 새 인스턴스라 리셋 로직 자체가 필요 없다.

## 부수적으로 고친 것

`scripts/verify-doc-paths.ts` 가 `.env.local` 을 로드하지 않았다. tsx 직접 실행에는 Next 의 env 로딩이 없어서, `YOHAN_OS_ROOT` 를 넣어도 **이 스크립트만** 못 읽고 앱과 판정이 갈린다. 같은 레포의 `scripts/vector/incremental-cron.ts:12` 는 이미 `loadEnvConfig` 를 쓰고 있었다 — 이관해온 스크립트만 빠져 있었다. 붙이고 `npm run verify:docs` 로 등록했다.

## 게이트

| | 결과 |
|---|---|
| lint | **0 errors 0 warnings** (8 → 0) |
| typecheck | 통과 |
| build | 통과 — 라우트 30개 (삭제 3개 반영) |
| test | 10/10 |
| 잔존 참조 | 삭제 7파일 전부 0건 (`nlp-command` 1건은 "왜 없앴는지" 주석) |
| `verify:docs` | **미실행** — `YOHAN_OS_ROOT` 미설정. `.env.local` 은 권한 정책상 요한이 직접 |

## 다음

- `.env.example` 에 `YOHAN_OS_ROOT`·`YOHAN_REPOS_ROOT` 추가 + `.env.local` 작성 — **요한 직접**(에이전트는 `.env.*` 읽기 금지)
- 그 뒤 `npm run dev` 로 4탭 실기동 확인 → PR
