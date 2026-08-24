# 프로젝트 컨텍스트

> 이 파일은 `vhk context`로 자동 생성되었습니다.
> AI 어시스턴트에게 프로젝트 맥락을 제공합니다.

## 원본 지도 (Source of Truth)

> 같은 사실은 원본 한 곳에서만 고치세요. 스냅샷은 원본을 읽어 다시 만듭니다.

- **규칙(원본)**: `RULES.md` — 규칙은 여기 한 곳에서만 수정
- **작업 정의·수용 기준**: `RULES.md`나 프로젝트 문서가 지정한 추적 원본 — 경로를 추측하지 않음
- **로컬 Goal 실행 상태**: `goals/*.md` frontmatter — 원본에서 만든 비추적 실행 카드
- **Goal 검사 스크립트(파생)**: `scripts/check-goal-<번호>.mjs` — 직접 수정 금지, `vhk goal sync`로 재생성
- **파생 스냅샷**: `.vhk/context.md`, `docs/state/next-task.md` — 원본 아님
- **로컬 차단 기록**: `docs/state/blockers.md` — append-only, 작업 정의 원본 아님
- **버전·릴리스**: `package.json`, `CHANGELOG.md`
- **명령 목록**: `COMMANDS.md` (+ `vhk help`)
- **파생본(직접 수정 금지)**: `.cursorrules`·`.windsurfrules`·`.github/copilot-instructions.md`·`AGENTS.md`·`GEMINI.md` 등 7종 + `CLAUDE.md` 규칙 영역 → `vhk sync` 로 생성

## 기술 스택

> 기술 스택 상태: 확정

### 선언된 기술 스택 (RULES.md)

- Next.js 16 · React 19 · TypeScript (strict)
- Tailwind CSS 4 + shadcn (style: base-nova)
- Qdrant (벡터 저장) · Ollama (로컬 임베딩 bge-m3, 1024d) · Notion API (읽기)
- gray-matter (md frontmatter) · recharts · three.js

### 실제 감지된 기술 스택 (package.json)

- **프레임워크**: Next.js 16.2.9
- **언어**: TypeScript ^5
- **스타일**: Tailwind CSS ^4
- **패키지 매니저**: npm
- **패키지 이름**: yohan-control-tower
- **버전**: 0.1.0

## 헌법(core-rules) 소스

- configured — 사용자 규칙 파일 (v0.1.5)

## 디렉토리 구조

```text
├── .env.example
├── AGENTS.md
├── BACKLOG.md
├── CLAUDE.md
├── COMMANDS.md
├── components.json
├── config/
│   └── goal-status-extensions.yaml
├── docs/
│   ├── adr/
│   │   ├── ADR-000-template.md
│   │   ├── ADR-001-local-inbox-cli-bridge.md
│   │   ├── ADR-002-local-calendar-markdown-store.md
│   │   └── ADR-003-vhk-policy-enforcement.md
│   ├── ARCHITECTURE.md
│   ├── ECOSYSTEM-CONTRACT-AUDIT.md
│   ├── log/
│   │   ├── 2026-07-28-dashboard-migration.md
│   │   ├── 2026-07-28-prd-architecture-authoring.md
│   │   ├── 2026-07-28-ui-consolidation.md
│   │   ├── 2026-07-28-vhk-init-dogfooding.md
│   │   ├── 2026-07-30-yohan-inbox-operations.md
│   │   ├── 2026-08-01-inbox-capture-limit-alignment.md
│   │   ├── 2026-08-02-inbox-origin-boundary.md
│   │   ├── 2026-08-07-calendar-daily-use-mvp.md
│   │   ├── 2026-08-07-ecosystem-home-mvp.md
│   │   ├── 2026-08-07-local-calendar-mvp.md
│   │   ├── 2026-08-07-mission-project-drilldown-lint.md
│   │   ├── 2026-08-07-mission-rollup-f004.md
│   │   ├── 2026-08-10-focus-feed-knowledge-review.md
│   │   ├── 2026-08-12-control-tower-review-vector-ux.md
│   │   ├── 2026-08-23-agent-session-runtime-recovery.md
│   │   ├── 2026-08-23-design-team-intake-and-runtime-incident.md
│   │   ├── 2026-08-23-design-team-supervision-protocol.md
│   │   ├── 2026-08-23-focus-feed-knowledge-review-proof.md
│   │   ├── 2026-08-23-vhk-policy-baseline.md
│   │   ├── 2026-08-23-workstream-control-and-session-reconciliation.md
│   │   ├── 2026-08-24-autopilot.md
│   │   └── 2026-08-24-main-conductor-handoff.md
│   ├── operations/
│   │   ├── agent-session-recovery-runbook.md
│   │   ├── current-workstreams.md
│   │   ├── design-team-supervision-runbook.md
│   │   ├── handoffs/
│   │   ├── main-conductor-session-protocol.md
│   │   ├── reports/
│   │   └── supervised-session-skill-requirements.md
│   ├── patterns/
│   │   ├── auth-loopback-origin-dns-rebinding.md
│   │   ├── README.md
│   │   └── ux-client-filter-after-pagination-false-zero.md
│   ├── PRD.md
│   ├── rfc/
│   │   ├── 0001-notion-backed-common-workbench.md
│   │   └── README.md
│   ├── state/
│   │   ├── blockers.md
│   │   ├── learnings.md
│   │   └── next-task.md
│   ├── til.md
│   ├── troubleshooting/
│   │   └── TS-001-vhk-doctor-agents-md-false-drift.md
│   └── yohan-inbox-visual-qa.png
├── eslint.config.mjs
├── fixtures/
│   ├── agent-session-health/
│   │   ├── codex-runtime-home/
│   │   └── logs/
│   └── orca-stale-repos/
│       └── orca-data.json
├── GEMINI.md
├── goals/
│   ├── 1-yohan-inbox-operations.md
│   ├── 10-calendar-daily-use-release.md
│   ├── 11-vhk-all-done-handoff.md
│   ├── 12-korean-user-facing-artifacts.md
│   ├── 13-focus-feed-knowledge-review-proof.md
│   ├── 15-vhk-policy-baseline.md
│   ├── 16-design-team-supervision-protocol.md
│   ├── 17-design-team-intake-and-runtime-incident.md
│   ├── 18-workstream-control-and-session-reconciliation.md
│   ├── 19-agent-session-runtime-recovery.md
│   ├── 2-ecosystem-home-mvp.md
│   ├── 2-focus-feed-knowledge-review-ui.md
│   ├── 20-main-conductor-session-handoff.md
│   ├── 3-mission-project-drilldown-lint.md
│   ├── 4-local-calendar-mvp.md
│   ├── 5-calendar-item-editing.md
│   ├── 6-calendar-trash-contract.md
│   ├── 7-calendar-trash-ui.md
│   ├── 8-calendar-mobile-agenda-first.md
│   ├── 9-vhk-session-continuity.md
│   └── _meta.md
├── logs/
│   ├── knowledge-review-dev.err.log
│   └── knowledge-review-dev.out.log
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── icon.svg
│   ├── manifest.json
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
├── RULES.md
├── scripts/
│   ├── check-agent-session-health.mjs
│   ├── check-goal-1.mjs
│   ├── check-goal-10.mjs
│   ├── check-goal-11.mjs
│   ├── check-goal-12.mjs
│   ├── check-goal-13.mjs
│   ├── check-goal-15.mjs
│   ├── check-goal-16.mjs
│   ├── check-goal-17.mjs
│   ├── check-goal-18.mjs
│   ├── check-goal-19.mjs
│   ├── check-goal-2.mjs
│   ├── check-goal-20.mjs
│   ├── check-goal-3.mjs
│   ├── check-goal-4.mjs
│   ├── check-goal-5.mjs
│   ├── check-goal-6.mjs
│   ├── check-goal-7.mjs
│   ├── check-goal-8.mjs
│   ├── check-goal-9.mjs
│   ├── check-local-setup.mjs
│   ├── check-project-policy.ts
│   ├── recover-orca-stale-repos.mjs
│   ├── run-vhk.mjs
│   ├── set-orca-repo-visibility.mjs
│   ├── vector/
│   │   ├── incremental-cron.ts
│   │   └── init-collections.ts
│   └── verify-doc-paths.ts
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── vector/
│   ├── components/
│   │   ├── calendar-view.tsx
│   │   ├── command-palette.tsx
│   │   ├── constellation-view.tsx
│   │   ├── doc-card.tsx
│   │   ├── doc-preview.tsx
│   │   ├── full-charts.tsx
│   │   ├── graph-view-2d.tsx
│   │   ├── header.tsx
│   │   ├── home-view.tsx
│   │   ├── knowledge-review-panel.tsx
│   │   ├── overnight-status-card.tsx
│   │   ├── project-view.tsx
│   │   ├── publish-status-card.tsx
│   │   ├── sidebar.tsx
│   │   ├── sot-draft-panel.tsx
│   │   ├── table-view.tsx
│   │   ├── theme-provider.tsx
│   │   ├── timeline-view.tsx
│   │   ├── todo-view.tsx
│   │   ├── ui/
│   │   ├── vector/
│   │   ├── view-tabs.tsx
│   │   └── yohan-inbox-panel.tsx
│   └── lib/
│       ├── audits.ts
│       ├── calendar-route.test.ts
│       ├── calendar.test.ts
│       ├── calendar.ts
│       ├── constellation-gravity.ts
│       ├── constellation.ts
│       ├── doc-scope.ts
│       ├── docs-cache.ts
│       ├── domains.ts
│       ├── ecosystem-projects.ts
│       ├── force-sim-2d.ts
│       ├── http-cache.ts
│       ├── inbox-controller.test.ts
│       ├── inbox-controller.ts
│       ├── inbox-limits.ts
│       ├── knowledge-review-controller.test.ts
│       ├── knowledge-review-controller.ts
│       ├── lint.test.ts
│       ├── lint.ts
│       ├── memory.ts
│       ├── missions.test.ts
│       ├── missions.ts
│       ├── paths.ts
│       ├── project-policy.test.ts
│       ├── project-policy.ts
│       ├── projects.test.ts
│       ├── projects.ts
│       ├── publish.ts
│       ├── server-cache.test.ts
│       ├── server-cache.ts
│       ├── types.ts
│       ├── utils.ts
│       └── vector/
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── VISION.md
```

## VHK CLI 명령어

- `vhk gate — 아이디어 검증`
- `vhk start — 새 프로젝트 시작 마법사`
- `vhk bootstrap — Cursor/에이전트 배선 bootstrap (cursor)`
- `vhk init — 하네스 파일 생성`
- `vhk recap — 오늘 한 일 정리 + ADR 분리`
- `vhk sync — RULES.md → 규칙 파일 동기화`
- `vhk check — RULES.md 규칙 점검`
- `vhk secure — 보안 스캔 (시크릿 유출 검사)`
- `vhk cloud — .vhk 클라우드 백업·복원 (push/pull)`
- `vhk ship — 배포 체크리스트 + 회고`
- `vhk doctor — 개발 환경 점검 (+ --strict 드리프트 게이트)`
- `vhk save — git 저장 (add → commit → push)`
- `vhk undo — 최근 커밋 되돌리기`
- `vhk restore — sync 백업 복원`
- `vhk status — 프로젝트 상태 대시보드`
- `vhk stats — 통계 대시보드 — 패스율/차단율/진화 적용율 (읽기 전용)`
- `vhk diff — Git 변경사항 한국어 요약`
- `vhk diff-cover — 이번 변경이 테스트로 커버됐는지 측정 (자문형)`
- `vhk mcp — MCP 서버 시작 (stdio)`
- `vhk mcp-init — Cursor·Claude Desktop MCP 설정 생성`
- `vhk inject-bootstrap — tier S harness (ecosystem · CORE-RULES · context · mcp.example)`
- `vhk deploy — 프로덕션 배포 (자동 감지)`
- `vhk env — .env → .env.example 동기화`
- `vhk env-check — 필수 환경변수 누락 검사`
- `vhk publish — npm 배포 (버전 범프 → 빌드 → 테스트)`
- `vhk design — 디자인 토큰 생성`
- `vhk design-palette — 컬러 팔레트 프리셋 선택`
- `vhk theme — 다크/라이트 모드 CSS 생성`
- `vhk ref — 레퍼런스 URL 관리 (add/list/open)`
- `vhk harness — 통합 품질 점검 (lint+type+test+build)`
- `vhk audit — 보안 취약점 감사 (npm audit)`
- `vhk migrate — 패키지 매니저 전환 (npm/yarn/pnpm)`
- `vhk update — VHK CLI 셀프 업데이트`
- `vhk context — 프로젝트 맥락 파일 생성 (.vhk/context.md)`
- `vhk mode — Safety Mode 조회/변경 (lite|standard|strict)`
- `vhk verify — 검증 게이트 실행 + 증거 기록`
- `vhk cost — 비용·예산 가드 — add/check/budget (자문형)`
- `vhk preflight — 출고 전 안전점검 (2FA·shim·env·lint·타입·테스트·git, 치명 시 차단)`
- `vhk testmap — test-first 매핑 점검 (변경 기능 ↔ 테스트 누락 경고)`
- `vhk worktree — worktree 가드 — 생성 시 env/설정 자동 복사·누락 점검 (add/check)`
- `vhk standup — 아침 브리핑 (어제 한 일 + 오늘 추천 goal + 미해결)`
- `vhk today — 저녁 자축·회고 (오늘 커밋·완료 goal 카운트 + 격려)`
- `vhk review — 적대적 자기검증 (거짓완료 의심 탐지)`
- `vhk receipt — 증거 영수증 — 4대 기계증거로 거짓완료 판정 (block/caution/pass)`
- `vhk mission — 미션 계약 — 작업 목표·허용/금지 범위 선언·검증`
- `vhk context-show — 컨텍스트 파일 내용 출력`
- `vhk memory — 기억 관리 v2 (decisions/failures/successes)`
- `vhk recall — 기억 회상 (자연어 키워드 검색 — RFC 0049)`
- `vhk brief — 프로젝트 요약 보고서 생성`
- `vhk loop-brief — 루프 1틱 앵커 생성 (의도+goal1+교훈+STOP)`
- `vhk remind — 치명 규칙 재주입 (RULES.md NON-NEGOTIABLE/Forbidden 압축)`
- `vhk content — 콘텐츠 초안 프롬프트 (풀사이클 뒷단 — 콘텐츠/마케팅)`
- `vhk launch — 런칭 게시물 프롬프트 (풀사이클 뒷단 — 런칭)`
- `vhk ops — 운영 회고 프롬프트 (풀사이클 뒷단 — 운영)`
- `vhk sell — 판매 카피 프롬프트 (풀사이클 뒷단 — 판매)`
- `vhk work — AI 작업 시작/이어하기 (+ handoff)`
- `vhk goal — Goal 단계별 미션 관리`
- `vhk blocker — 블로커 기록 (3건 누적 시 HARD_STOP)`
- `vhk learn — 교훈 기록 → memory v2 단일 SoT`
- `vhk win — 성공 기록 → memory successes (reinforce 입력)`
- `vhk autonomy-log — 자율 루프 런 시작/종결 기록 (완주율 계측, #373)`
- `vhk watch — 무인 세션 정지 감시 — idle 초과 시 텔레그램·콘솔 알림`
- `vhk resume — .vhk/HARD_STOP 해제 (--confirm 필요)`
- `vhk pattern — 반복 패턴 감지·목록 (avoid/reinforce)`
- `vhk evolve — 패턴 → 7일 룰 후보 표시·사람 승인·되돌리기`
- `vhk loop — 자가진화 조율 1틱 — 다음 한 수 (읽기 전용)`
- `vhk seo — SEO·수익 대시보드 (init: 사이트 등록 + 자격증명 보관)`
- `vhk config — vhk 사용자 설정 (set-rules-file: 사용자 규칙 YAML, 재시작 불필요)`

## 최근 활동 (git log — goals/blockers/memory 미사용 시 폴백)

```
881b39b feat: 상시 지휘자 인수인계 정본 추가
1b5b4fb fix: 관제탑 세션 복구와 운영 흐름 정비
cf61612 docs: yohan-inbox 화면 검수 캡처 회수 (dev 루트에 떠 있던 것)
c048f8d chore(위생): 지식 검토 UI 목표 문서 커밋 + 런타임 산출물 무시
2ab0048 Merge pull request #31 from byh3071-cpu/knowledge-p0-control-tower-r2
```

---

_생성: 2026. 8. 24. 오후 2:17:17_
_vhk-context-git: 881b39bde2deabb8b9bb626a7aa39f8dc3550f1a_
