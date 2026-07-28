# yohan-control-tower — Antigravity Rules

> 코딩/디자인 전용. 기록/운영 → CLAUDE.md 참조.
> ⚡ 이 파일은 RULES.md에서 자동 생성됨 (vhk sync). 직접 수정 금지.

## 필수 참조
- docs/PRD.md · docs/ARCHITECTURE.md · CLAUDE.md · RULES.md

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
- 파괴적 라우트(`/api/vector/reset` 등)는 same-origin 검사 필수
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
