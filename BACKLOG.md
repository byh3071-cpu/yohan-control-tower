# BACKLOG

> v1 OUT 기능은 여기에 기록. 범위 수비 필수.

## v1.1 (PRD 확정 범위)

- **F004 미션 롤업 + 홈 탭** — 5탭에서 동결. 6번째 금지
- **F005 프로젝트 드릴다운** — 미션 → 레포 → Task. `<repo>/goals/*.md` 다레포 스캔
- **F006 정합성 lint 엔진** — goal-schema · freshness · superseded · orphan 4규칙
- **선행 게이트**: brain `projects.yaml` 의 미션 **미배속 21건** 배속 확정 (요한 판정)

## 코드 부채 (v1.0 이관이 드러낸 것)

`vhk check` 위반 11건 중 **진짜 7건**:

| 항목 | 위치 | 성격 |
|---|---|---|
| `any` 2건 | `src/lib/vector/ollama.ts:26` · `qdrant.ts:183` | RULES "TypeScript strict — any 금지" 위반. 이관 전부터 있던 벡터 코드 부채 |
| PascalCase 파일명 5건 | `src/components/vector/{CollectionStatus,IngestButton,LogViewer,QueryTester,VectorPanel}.tsx` | RULES "파일명 kebab-case". 다른 컴포넌트(`doc-card`·`todo-view`)는 kebab 이라 **벡터 폴더만 규칙이 갈렸다** |

rename 은 import 수정을 동반하므로 7파일 이상 — 별도 작업으로 잡을 것.

## VHK 도구 결함 (이슈 등록 후보)

`vhk check` 오탐 2종:

- **env 이름을 시크릿으로 오판** — `paths.ts:18` 의 `YOHAN_OS_ROOT` 는 **에러 메시지 문자열 안의 변수 이름**이지 값이 아니다. 이름 노출은 시크릿 유출이 아니다
- **`.test.ts` 를 kebab-case 위반으로 오판** — `notion-since.test.ts` 는 kebab 인데 `.test` 접미사 때문에 걸린다

기존 등록분: vhk #543 #544 #545 #546

- **상태 문서 규칙 모순** — 생성된 `AGENTS.md`는 `next-task.md`를 append-only라고 하지만 `vhk goal next`는 백업 후 덮어쓴다. VHK [#555](https://github.com/byh3071-cpu/vhk/issues/555)에 재현·기대 동작 등록 완료.
- **CORE-RULES 무음 다운그레이드** — 설정 원본이 없는 새 환경에서 `vhk sync`가 configured v0.1.5를 번들 v0.1.0으로 경고 없이 교체하고 `sync --check`도 통과한다. VHK [#556](https://github.com/byh3071-cpu/vhk/issues/556)에 등록했고 프로젝트 래퍼로 차단한다.
- **개인 memory 백업 Git 노출** — `vhk learn`의 `.vhk/memory.json.bak`이 개인 교훈을 담고도 ignore되지 않는다. VHK [#557](https://github.com/byh3071-cpu/vhk/issues/557)에 등록했고 `.vhk/.gitignore`의 `*.bak`으로 차단한다.
- **전체 Goal 완료 시 stale next-task** — `vhk goal next`가 모든 Goal 완료를 출력하고도 마지막 Goal `IN_PROGRESS` snapshot을 남긴다. VHK [#558](https://github.com/byh3071-cpu/vhk/issues/558)에 등록했고 프로젝트 래퍼가 VHK 관리본만 전체 완료 snapshot으로 보정한다.

## 2차 (범위 밖 — 인터뷰에서 나온 것)

- **자동 갱신 배선** — 전역 Stop hook(4벤더) · GitHub Actions on push · 작업스케줄러. always-on 은 Actions 뿐
- **멀티벤더 스택 관리축** — 스킬 드리프트 실측(claude 25 / codex 23 / cursor 21 / gemini 19 / agy 9) · 훅 이벤트명·MCP 스키마가 4벤더 전부 상이
- **일정·캘린더축** — 노션 일정/할일 337행 → 파일 마이그레이션. L2-5 삶·기반의 주 뷰
- **모바일 A** — brain→노션 자동 publish 복구 (`automation:batch` 정지 상태)
- **모바일 B** — Tailscale + PWA. MagicDNS → `tailscale cert` → `tailscale serve`. **Vercel 0개**
- **재무축 2차** — 노션 가계부 연결 · 투자봇 계측 · 프로젝트별 투입시간
- ~~**`api/search` silent fallback** — LLM 파싱 실패가 `catch { indices = [] }` 로 "결과 없음"과 합쳐진다. 팔레트의 유일한 검색 경로라 중요도 상승.~~ 해결(Goal 25): AI 200의 유효 배열만 성공으로 받고 정상 `[]`와 해석 실패 502를 분리했으며, command palette도 공유 parser로 오류와 0건을 구분한다.
- **`api/search` 출고 잔존 위험 (Goal 25 P2)** — 캐시 교체, same-origin, 정확한 Content-Type, query 길이 상한, upstream timeout, 문서 제목·category·date·tags 전송 메타 최소화는 이번 실패 경계와 독립된 설계·보안 범위라 보류한다. fetch 자체의 network rejection은 프레임워크 오류 경계에 남고, 정적 checker는 런타임 의미를 완전히 증명하지 못한다.
- **command palette 응답 순서 fence 부재 (Goal 25 범위 밖 P2)** — 연속 AI 검색 요청에 request id 또는 abort fence가 없어 먼저 보낸 느린 응답이 최신 query 결과를 덮을 수 있다. 실패/0건 응답 계약과 독립된 비동기 UI 순서 보장 설계로 보류한다.
- ~~**`api/run` args 필터** — 블록리스트(`route.ts:89` TODO)를 allowlist 로 좁힐 것~~ 해결(Goal 24): action별 고정 executable·argv registry, 정확한 JSON media type, `ingest:url` 전용 HTTP(S) 원문·control 검사, same-origin 선검사, `execFile` no-shell runner, URL/route 보존형 output redaction과 실행 없는 주입 테스트로 교체했다.
- **`api/run` 출고 잔존 위험 (Goal 24 P2)** — timeout 뒤 손자 프로세스 회수는 미실측 추론이고, POSIX의 `npm`/`npx`는 PATH 상대 executable이며, Windows 고정 `npm-cli.js`/`npx-cli.js` 경로 존재는 실행 없이 검증되지 않았다. 서버측 실패 로그 부재와 문자열 기반 정적 checker 한계도 유지하며 process-tree kill·외부 action 실행·신규 설계는 별도 승인 범위로 남긴다.
