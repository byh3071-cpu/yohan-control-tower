# yohan-control-tower — AGENTS.md (에이전트 작동 규약)

> ⚡ 이 파일은 RULES.md에서 자동 생성됨 (vhk sync). 직접 수정 금지.

## Loop Protocol
- 루프: `context → goal next → 작업 → goal check → goal done`
- 작업 시작 시 `.vhk/HARD_STOP` 확인 — 있으면 모든 자동화 즉시 중단.
- active goal 만 작업. `docs/state`(next-task/blockers)는 append-only.
- 교훈·결정·실패·성공은 `vhk memory`(memory v2 4버킷, 단일 출처).
- 게이트(tsc / test:run / build) 통과해야만 `vhk goal done`.

## VHK Project Rules

> Project rules are generated from `RULES.md`; optional user rules use the generic rules-file contract.

- **Cursor:** `.cursor/rules/ecosystem.mdc` (vhk inject-bootstrap)
- **Optional rules:** `VHK_RULES_FILE` or `vhk config set-rules-file <yaml>`
- **금지:** AGENTS.md 손수 편집 → `RULES.md` + `vhk sync`

## 기술 스택
- Next.js 16 · React 19 · TypeScript (strict)
- Tailwind CSS 4 + shadcn (style: base-nova)
- Qdrant (벡터 저장) · Ollama (로컬 임베딩 bge-m3, 1024d) · Notion API (읽기)
- gray-matter (md frontmatter) · recharts · three.js

## 프로젝트 정체성 · 아키텍처 불변식
- 한 줄 설명: 요한 생태계 **통합 관제탑** — brain(SoT)을 읽어 미션·프로젝트·Task·문서·벡터를 한 화면에서 관제하는 **로컬 전용** 대시보드
- 포트: **3001**
- **brain = SoT.** 관제탑은 읽기 자유 + **신규 파일 생성만** 허용. 기존 brain 파일 수정은 금지. — **이 레포 자체 규칙이다. 아직 계약 조항이 아니다.** 현행 `ecosystem-contract.yaml` 의 `control_tower.must_not` 은 `read_brain_memory_as_ingest_source` 하나뿐이고, `modify_existing_brain_files` 신설은 **계약 개정(사람 승인 커밋) 대상**이다.
- **로컬 전용.** localhost 서비스(Qdrant 6333 · Ollama 11434)와 로컬 파일시스템에 의존한다. 클라우드 배포 대상이 아니다.
- brain 경로는 `YOHAN_OS_ROOT` env 로 해석한다. 절대경로 하드코딩 금지.
- 노션은 **사람용 뷰·모바일 인박스**. 정본이 아니다 (ADR-009).
- 계층은 `projects.yaml`(brain) → `<repo>/goals/*.md` → `.vhk/events/*.jsonl` 순으로 읽는다.

## 프론트 아키텍처 (인지 부하 상한)
- **탭 5개 상한.** 늘리려면 기존 탭을 합쳐라. 오너가 복잡성 때문에 기존 도구(노션 워크스페이스·스튜디오 OS)를 버린 이력이 있다 — **복잡성 증가 = 설계 실패**로 본다.
- 홈은 1화면. "지금 뭐 하나"에만 답한다.
- 복잡성은 API 뒤로 숨긴다. 프론트는 결과 숫자만 받는다.
- AI 는 분류·상태변경을 **제안**만 한다. 승인은 사람.

## 코딩 규칙
- TypeScript strict — `any` 금지. 타입 SoT 2축: 공용 = `src/lib/types.ts`, 벡터 = `src/lib/vector/types.ts` (벡터 모듈 7개 + 테스트가 `./types` 상대 import 라 같은 디렉토리 유지).
- try-catch 필수, 빈 catch 금지
- `console.log` 프로덕션 제거
- 파일명 kebab-case
- 하드코딩 금지 — 경로·ID·상수는 설정 한 곳에

## 보안 코딩 규칙
- 시크릿 평문 금지 → `.env.local` + `.gitignore`
- 멀티벤더 설정(`~/.claude.json` · `~/.codex/` · `~/.cursor/` · `~/.gemini/`)을 읽을 때 **토큰·credential 값은 마스킹**한다. `.credentials.json` · `auth.json` · `oauth_creds.json` · `_env_backup/` 은 열지 않는다.
- 파괴적 라우트(`/api/reset` 등)는 same-origin 검사 필수
- 로컬 명령 실행(`/api/run`)은 allowlist + **cwd 명시**. 암묵 폴백 금지.
- LLM 이 뱉는 닫힌집합 값(select·enum)은 코드에서 allowlist 대조 (PAT-001)
- 고위험 작업(배포·삭제·publish·main 직 push)은 사람 승인 후에만

## 커밋 컨벤션
- `feat:` / `fix:` / `refactor:` / `docs:` / `chore:`
- 커밋 메시지는 한국어. **UTF-8 인코딩 확인** — 과거 깨짐 이력 있음 (PAT-009)

## Next.js 코딩 규칙
<!-- BEGIN:nextjs-agent-rules -->
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 기록 규칙
- 세션 종료 시 `docs/log/YYYY-MM-DD-{작업명}.md` 생성
- 기술 선택 시 `docs/adr/ADR-{번호}-{제목}.md` 생성
- 범용 패턴 발견 시 `docs/patterns/PAT-NNN-{영문명}.md`
- 기능 완성 / 에러 해결 / ADR / 세션 종료 시 Notion "바이브코딩 Dev Log" DB에 1행 적재
- 태그는 기존 옵션만 사용, 같은 작업 중복 적재 금지 (SoT Key)

## 기타 규칙
> RULES.md 의 비표준 H2 섹션 — 표준 매핑 외이지만 보존 위해 전파(직접 수정은 RULES.md 에서).

### Ecosystem (cross-repo)
> Contract SoT: yohan-brain `memory/core/ecosystem-contract.yaml` (obey when status=active).
> Roster: yohan-brain `memory/core/agent-roster.yaml` (CLI·모델·effort; obey when active).
> Tier: yohan-brain `memory/core/inheritance-registry.yaml`.

- 같은 레포·같은 브랜치에 에이전트 2명 금지 → worktree만.
- 배포·시크릿·npm publish = 사람 Gate. 교리 본문 복제 금지(포인터만).

<!-- YOHAN-ROSTER-CARD:BEGIN (managed by yohan-brain ops/propagation — SoT를 고쳐라, 직접수정 금지) -->

### 상시 지휘자 — 라우팅 카드 (yohan ecosystem)
> SoT: yohan-brain `memory/core/agent-roster.yaml` `conductor_always_on` (v0.4+, status=active면 obey).
> 이 레포 자체 규칙(RULES/CLAUDE LIVE)이 있으면 그게 우선(precedence).

- 모든 태스크: 해법 구상 **전에** 크기 판정 → `라우팅: S|M|L — 계획 1줄 (근거: 파일수/신규설계/리스크)` 선언 후 진행. 키워드("풀개발") 불필요, 항상.
- **판정법(감 금지)**: ①하드 트리거 먼저 → 해당 시 즉시 확정 · ②없으면 예상 수정 파일 수를 먼저 세고 구간 매핑(≤2=S·3~6=M·≥7/다레포=L). LLM 자유분류는 불안정(실측 33~56%) — 파일수 결정론이 정답.
- **S**(≤2파일·신규설계 없음·≤15분): 지휘자 단독. 서브에이전트·orca 금지(오버헤드).
- **M**(3~6파일·부분 신규): 서브에이전트 티어링 — 탐색 haiku → 계획 opus(승인) → 구현 sonnet → 적대검증 opus/fable 루프.
- **L**(≥7파일·신규 모듈·다레포·릴리즈급): /goal orca 풀파이프라인 — Scout→Plan승인★→worktree fanout→타벤더 적대검증→머지게이트★. "풀개발"=L 강제.
- 하드 트리거(분류 생략): 스키마 마이그레이션·인증/결제/보안·크로스레포·릴리즈 = 무조건 **L** · 오타·문서/주석만 = **S**.
- 애매하면 작은 쪽 시작 → 검증 실패(테스트/tsc/critic) 시 **재선언 후 승급**(몰래 계속 금지).
- 동시 작업 = worktree만. 같은 레포·같은 브랜치 2에이전트 금지.
- Antigravity(agy) = 보조·초안 전용(메인 지휘 금지) — 산출물은 상위 티어 검증 필수.
- 배포·시크릿·npm publish·main 직push = 사람 게이트(불변).
<!-- YOHAN-ROSTER-CARD:END -->
