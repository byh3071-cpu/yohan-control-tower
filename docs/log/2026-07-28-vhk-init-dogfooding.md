---
날짜: 2026-07-28
작업: VHK 2.12.0 풀 init + 독푸딩
브랜치: feat/control-tower-unification
관련: docs/troubleshooting/TS-001-vhk-doctor-agents-md-false-drift.md
---

# VHK 풀 init + 독푸딩 — 규칙 SoT 정비

## 배경

`yohan-control-tower` 를 벡터 인제스트 도구에서 **생태계 통합 관제탑**으로 재정의하는 작업(Phase 1~4)의 기초공사. 이 레포는 그동안 `.vhk/`·`RULES.md`·`docs/`·`goals/` 가 전부 없었다. 관제탑이 앞으로 45개 레포의 `goals/`·`docs/` 규격을 읽어 집계할 텐데, **그 규격을 자기 자신부터 지키지 않으면 신뢰할 수 없다** — 그래서 풀 init 을 골랐다.

## 한 일

1. 작업 브랜치 `feat/control-tower-unification` 생성 + 기존 룰 파일 백업
2. `vhk init -y` — 21개 파일 생성, brownfield adopt 모드로 기존 규칙 병합
3. `vhk goal init` — `goals/_meta.md` + `docs/state/{next-task,blockers,learnings}.md`
4. `vhk config set-rules-file` + `vhk inject-bootstrap --force` — CORE-RULES 소스 교정
5. `RULES.md` 재작성 — 중복 제거 + 표준 섹션 제목 정렬
6. `vhk sync` 2회 — 8개 도구 파일 파생
7. `vhk doctor` 실행 → 드리프트 오탐 발견 → 원인 규명 → TS-001 기록

## 발견한 결함 3개

### P1. adopt 가 roster 카드를 2벌 병합

`vhk init` 의 brownfield adopt 는 기존 규칙 파일을 `RULES.md` 로 자동 병합한다. 그런데 `CLAUDE.md` 와 `AGENTS.md` **양쪽에** 동일한 `YOHAN-ROSTER-CARD` 블록이 있었기 때문에, 병합 결과 같은 카드가 2벌 들어가고 `BEGIN`/`END` 마커 짝이 깨졌다 (`AGENTS.md` 에서 `BEGIN=1 END=2`, `RULES.md` 라인 59에 고아 `BEGIN`).

→ `RULES.md` 를 재작성해 카드 1벌만 남기고 마커를 정상화. 이후 `CLAUDE.md`·`AGENTS.md`·`RULES.md` 모두 `BEGIN=1 END=1`.

**교훈:** adopt 는 "여러 파일 → 한 파일" 병합이라 **입력 파일 간 중복을 감지하지 못한다**. 여러 도구 파일에 같은 블록을 전파해 두는 생태계에서는 init 직후 중복 검사가 필수다.

### P2. CORE-RULES 가 brain 정본이 아니라 번들 스냅샷

`.agents/CORE-RULES.md` 가 `v0.1.0 (generated from vhk bundled snapshot)` 으로 생성됐다. 계약(`ecosystem-contract.yaml` `file_ownership`)은 이 파일의 출처를 `injected_from: memory/core/core-ruleset.yaml` 로 못박고 있는데, 실제 brain 정본은 **v0.1.5** 다. 즉 계약 위반 상태로 시작됐다.

VHK 가 init 로그에서 이 사실을 경고하긴 했다 — 다만 성공 메시지들 사이에 섞여 있어 놓치기 쉽다.

→ `vhk config set-rules-file <brain core-ruleset.yaml>` 후 `vhk inject-bootstrap --yes --force` 로 재생성. `v0.1.5 (generated from configured rules file)` 확인.

**교훈:** 새 레포에서 `vhk init` 을 돌린 직후엔 **CORE-RULES 헤더의 버전·출처 문자열을 눈으로 확인**해야 한다. 기본값이 조용히 들어간다.

### P3. `vhk doctor` 의 AGENTS.md 드리프트 오탐 (VHK 버그)

`vhk sync` 직후인데도 `vhk doctor` 가 계속 "AGENTS.md 어긋남"을 보고했다. 같은 상태에서 `vhk sync --check` 는 "일치" 판정 — **두 명령의 답이 모순**이었다.

원인은 `lib/drift.ts:46` 이 생성기를 2인자로만 호출해서 `compactRel` 기본값이 적용되는 것. `sync` 는 디스크를 실측해 `null` 을 넘기므로 compact 안내 줄을 생략하는데, `drift` 는 그 줄이 있다고 기대한다. 상세는 TS-001.

→ 크로스레포(vhk) 수정은 하드 트리거 L 이라 이번 스코프 밖. 기록만 남기고 진행.

**교훈:** 생성기와 검증기가 같은 산출물을 **각자 재계산**하면 언젠가 갈라진다. 반드시 같은 입력을 받아야 한다.

## RULES.md 섹션 제목 정렬

`vhk sync` 는 섹션 제목을 **substring 매칭**으로 분류한다 (`sync.ts:68`):

```
CURSORRULES_KEYS = ['코딩 규칙','기술 스택','아키텍처','디자인','Anti-patterns','커밋','도메인']
CLAUDE_MD_KEYS   = ['기록','로그','ADR','트러블슈팅','TIL','/done','체크리스트','VHK 운영']
```

여기 안 걸리는 섹션은 `.cursorrules`·`CLAUDE.md` 같은 코딩 규칙 파일에 **전파되지 않는다**(AGENTS.md 「기타 규칙」에만 남음). 처음 작성한 `## 안전 규칙`·`## 프론트 규칙`·`## Next.js 주의` 가 전부 여기 걸려서, 정작 Claude Code 가 보안·인지부하 규칙을 못 보는 상태였다.

제목만 고쳐 해결:

| 이전 | 이후 | 걸리는 키 |
|---|---|---|
| `## 안전 규칙` | `## 보안 코딩 규칙` | 코딩 규칙 |
| `## 프론트 규칙 (인지 부하 상한)` | `## 프론트 아키텍처 (인지 부하 상한)` | 아키텍처 |
| `## Next.js 주의` | `## Next.js 코딩 규칙` | 코딩 규칙 |
| `## 프로젝트 정체성` | `## 프로젝트 정체성 · 아키텍처 불변식` 로 흡수 | 아키텍처 |

비표준 섹션 **6개 → 2개**로 축소. 남은 2개(`Ecosystem`·`상시 지휘자`)는 의도적 — cross-repo 규약은 AGENTS.md 에만, 지휘자 카드는 CLAUDE.md 에 마커 블록으로 이미 존재한다.

**교훈:** VHK 의 섹션 분류는 문서화돼 있지 않고 substring 매칭이다. 새 섹션을 만들 때 **제목에 표준 키를 포함**시켜야 도구 파일까지 도달한다.

## 검증

| 게이트 | 결과 |
|---|---|
| `npm run typecheck` | ✅ 통과 |
| `npm run lint` | ✅ 통과 |
| `npm test` | ✅ 10/10 |
| `npm run build` | ✅ 통과 (라우트 17개) |
| roster 카드 마커 | ✅ CLAUDE.md·AGENTS.md·RULES.md 전부 `BEGIN=1 END=1` |
| CORE-RULES 출처 | ✅ `v0.1.5 (configured rules file)` |
| `vhk sync --check` | ✅ 일치 |
| `vhk doctor` | ⚠️ AGENTS.md 오탐 1건 (TS-001, VHK 측 버그) |

## 다음

- `.vhk/NEEDS_CUSTOMIZATION` 은 **아직 닫지 않았다** — `docs/PRD.md`·`docs/ARCHITECTURE.md` 의 `[여기에 작성: …]` 슬롯을 인터뷰 결과로 채운 뒤 `customization-done` 생성 예정.
- Phase 1(계약·레지스트리 개정, brain 레포)로 이동.
