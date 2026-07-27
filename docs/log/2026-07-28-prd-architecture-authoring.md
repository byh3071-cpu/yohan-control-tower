---
날짜: 2026-07-28
작업: PRD·ARCHITECTURE 저작 + 3라운드 적대검증
브랜치: feat/control-tower-unification
관련: docs/PRD.md · docs/ARCHITECTURE.md · docs/troubleshooting/TS-001-*.md
---

# PRD·ARCHITECTURE 저작 — 생성기/검증기 짝으로 3라운드

## 배경

`vhk init` 이 깔아준 `docs/PRD.md`·`docs/ARCHITECTURE.md` 는 `[여기에 작성: …]` 마커만 있는 빈 템플릿이었다. 오너가 "현업에서 하는 검증된 방식으로 쓰는지"를 물었고, 생태계에 이미 `yohan-core:prd-generator`·`prd-validator` 짝이 있는데 안 쓰고 있었다는 걸 발견했다.

아키텍처 쪽에는 대응물이 없어서 **신설**했다 — `arch-generator` · `arch-validator` (`yohan-cc-skills/plugins/yohan-core/agents/`).

## arch-generator / arch-validator 설계

`prd-generator` 의 철학(유형별 구조 · 블록리스트 · 정합성 3자 연결 · 2페이지 상한)을 아키텍처 도메인으로 이식했다. 핵심 차별점 3개:

| 축 | PRD 쪽 | 아키텍처 쪽 |
|---|---|---|
| 정합성 | 기능ID ↔ 구현표면 ↔ 진입점 | **기능ID ↔ 모듈 ↔ 데이터 소유자** |
| 최악의 블로트 | 마일스톤·페르소나 | **경로 없는 계층 박스** ("Presentation Layer → Business Layer") |
| 고유 검증 | — | **경로 실재 검증** — 문서의 모든 경로를 Glob/Read 로 실측해 `[실재]/[신규]/[없음]` 3분류 |

아키텍처 고유 항목으로 **실패 모드**(외부 의존이 죽으면 어떻게 되나)와 **불변식**을 필수화했다. "silent fallback 금지" 원칙을 검증 루브릭의 치명 항목으로 올렸다.

⚠️ 세션 중 신설한 서브에이전트는 **그 세션에서 호출할 수 없다** — 에이전트 목록이 세션 시작 시 고정된다. 이번엔 `general-purpose` 에 지침을 프롬프트로 주입해 동일하게 돌렸다. 다음 세션부터 `yohan-core:arch-generator` 로 정상 호출된다.

## 3라운드 결과

| 라운드 | PRD | ARCHITECTURE |
|---|---|---|
| 1차 검증 | 🔄 대규모 수정 (치명 3) | ⚠️ 조건부 (치명 4 · 중대 7) |
| 2차 검증 | ⚠️ 조건부 (치명 1 · 중대 4) | ⚠️ 조건부 (치명 1 · 중대 4) |
| 3차 수정 | 전 항목 반영, self-check 통과 | 전 항목 반영, self-check 4/4 |

**경로 실재 검증은 2라운드 모두 `[없음]` 0건**으로 통과했다. 반대로 **경로가 아닌 사실 주장에서 결함이 집중**됐다 — 이게 아키텍처 문서의 실제 취약점이라는 걸 실측으로 확인한 셈이다.

## 검증이 잡은 주요 결함

### 코드와 정반대인 주장 2건
- `command-palette.tsx:119` 의 유일한 fetch 는 `/api/nlp-command` 인데 문서는 "팔레트는 `/api/search` 만 쓴다"고 적었다. 그대로 구현하면 유지하기로 한 컴포넌트의 백엔드를 삭제하게 된다.
- `publish.ts:31-33` 이 `catch { return EMPTY }` 로 **정상 반환**해서 라우트가 `ok:true` + 0건을 낸다. 문서는 `ok:false` 라고 적었다. 즉 **레포 부재와 "글 0편"이 구별 불가** — 자기가 세운 "silent fallback 금지" 불변식을 자기 문서가 위반하고 있었다.

### 오너 결정으로 해소한 것
- **v1 분할** — 97파일 이관 + 신규 8모듈은 주 10~20h 로 과대. `v1.0 = 이관·통합` / `v1.1 = 계층축`. **v1.0 만으로 이름 단일화가 완결**된다는 게 결정적이었다.

  > ⚠️ 이 라운드에서 **검증 3라운드가 모두 놓친 사실 오류**가 뒤늦게 잡혔다. PRD·ADR 이 감사 H-02 를 "잔존"으로 인용했는데, 그건 `REVIEW-2026-07-19.md:53` 의 **최초 리뷰 시점 판정 열**이었다. 같은 파일 `:171-186` 의 최종 판정은 **"11건 전원 해소"** 다. H-02 는 소유 경로를 `brain/dashboard` 로 고정해 이미 닫혔고, ADR-012 는 그 경로를 재지정하는 것이다. **같은 문서 안에 시점이 다른 판정이 공존할 때의 함정** — 표의 어느 열이 최종인지 확인해야 한다.
- **F007(AI 비용 계기판) v1 OUT** — `.vhk/events/*.jsonl` 스키마에 토큰·비용 필드가 **0개**였다. `~/.claude.json` 은 최근 세션 1회분 스냅샷이고 50개 프로젝트 중 29개만 보유(58%). 데이터 출처 자체가 재설계 대상이라 뺐다.

### 내가 만든 결함 — 계약 인용 환각
`RULES.md` 를 쓰면서 `기존 brain 파일 수정 금지(계약 must_not: modify_existing_brain_files)` 라고 적었다. 실측하니 `ecosystem-contract.yaml` 의 `control_tower.must_not` 은 `read_brain_memory_as_ingest_source` 하나뿐이고 그 문자열은 brain 전체에 **0건**이었다.

계약 개정은 Phase 1 에서 할 일인데 RULES 가 먼저 기정사실로 만들었고, `vhk sync` 가 충실히 7파일로 전파해 **9파일이 자기 레포 규칙을 "계약"이라 부르는 순환 인용**이 됐다.

→ RULES 진원지 수정 + 재전파. 계약화는 선행 게이트 ① 의 항목으로 격상.

**교훈:** 규칙 문서에 출처를 쓸 때는 그 출처를 실제로 열어봐야 한다. 전파 자동화가 있으면 오류도 같은 속도로 퍼진다.

### validator 를 반박한 것 1건
`arch-validator` 가 `vhk/goals/_meta.md:42` 를 근거로 "goal status 정본은 7값"이라 판정했는데, 그 줄은 **"완료-스텁 게이트 검사 제외 목록"**이지 스키마 열거가 아니었다. 스키마 정본은 VHK init 템플릿 `_meta.md:26` 의 4값이 맞다.

다만 **결론은 validator 가 옳았다** — 실측 분포:

| 레포 | 템플릿 4값 밖 |
|---|---|
| vhk (49개) | `DEFERRED` 7 · `OBSERVING` 1 · `CANCELED` 1 |
| brain (13개) | `PR_OPEN` 2 · `ACTIVE` 1 · `BACKLOG` 1 |

총 13건. 4값을 하드코딩한 lint 는 거짓 위반을 양산한다 → "4값 = 정본, 그 밖은 `warn` + 레포별 확장 허용 목록을 설정으로 수용" 으로 정책 확정.

**교훈:** 검증기의 결론과 근거를 분리해서 봐야 한다. 근거가 틀려도 결론이 맞을 수 있고, 그때 근거만 반박하고 결론을 버리면 진짜 결함을 놓친다.

## 남은 사람 게이트 3개

① `ecosystem-contract.yaml` + `inheritance-registry.yaml` 개정 커밋 (v1.0 착수 전)
② `brain/memory/core/projects.yaml` 생성 = 미션 taxonomy 확정 (v1.1 착수 전)
③ F010 의 `git:sync`(= `git pull && git push`) · `sync:notion:push` UI 노출 여부

## 다음

Phase 1 — brain 계약·레지스트리 개정. 크로스레포라 PR 머지 = 사람 게이트.
