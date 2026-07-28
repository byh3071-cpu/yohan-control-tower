---
날짜: 2026-07-28
작업: dashboard 이관 + 이관 후 정합 (Phase 2)
브랜치: feat/control-tower-unification
관련: docs/ARCHITECTURE.md · yohan-brain PR #155(머지됨) · ADR-012
---

# dashboard 이관 — brain 에서 관제탑으로

## 한 일

`yohan-brain/dashboard/` 60파일을 이 레포로 옮기고, 옮기면서 전제가 깨진 코드를 고쳤다. ADR-012 가 확정한 "관제탑 = 실체 1개"의 물리적 실행이다.

세 덩어리로 나눠 진행했다.

**2-A (선전환)** — 이관받을 구조를 먼저 만들었다. 이 레포 37파일을 `src/**/vector/` 로 옮기고 `tsconfig` paths 를 `@/* → ./src/*` 로 바꿨다. dashboard 는 원래 `src/` 구조라 이렇게 하면 **60파일을 손대지 않아도 된다**. 37 대 60 이라 다수를 안 건드리는 쪽을 골랐다.

**2-B-1 (이관)** — `git subtree split` 으로 dashboard 히스토리 20커밋을 보존한 브랜치를 만들고, `-s ours --no-commit` 으로 히스토리만 연결한 뒤 `src/`·`public/`·`components.json` 만 선택 반입했다. 통짜 merge 를 피한 이유는 dashboard 루트에 `package.json`·`tsconfig.json` 이 있어 2-A 에서 잡은 설정을 덮어쓰기 때문이다.

**2-B-3 (brain 정리)** — brain 에서 dashboard 84파일과 실물 1GB 를 걷어내고 `package.json` 의 dashboard 참조 13곳을 정리했다. PR #155 로 머지됨.

## 실증된 판단

**`src/` 선전환이 옳았다.** dashboard 60파일이 **import 무수정**으로 붙었고 typecheck 가 에러 0으로 통과했다. 만약 반대로 갔다면(dashboard 를 이 레포 구조에 맞춤) 60파일의 import 를 전부 고쳐야 했다.

## 이관 후 고친 결함 5건

이관은 파일을 옮기는 일이지만, **옮기면 전제가 바뀌는 코드**가 있다. 검증에서 나온 것들이다.

| # | 결함 | 왜 이관으로 깨지나 |
|---|---|---|
| 1 | `api/run` 의 `ROOT = resolve(cwd, "..")` | dashboard 가 `brain/dashboard` 안에 있을 때만 `..` 이 brain 이었다. 옮기면 `yohan-ecosystem/` 을 가리켜 11개 액션이 전부 엉뚱한 곳에서 실행된다 |
| 2 | `api/run` 의 위험 명령 2건 | `git:sync`(main 직 push)·`sync:notion:push`(외부 발송)가 사람 게이트 규칙과 충돌. `humanGate` 플래그로 403 거부 |
| 3 | `paths.ts` 의 cwd 추론 폴백 | 이 레포에 `memory/` 가 생기면 자기 자신을 brain 으로 조용히 해석한다 |
| 4 | `publish.ts` 의 `catch { return EMPTY }` | 형제 레포 부재와 "글 0편"이 화면에서 구별 불가 |
| 5 | `sot-draft` 의 무검사 `writeFile` | 같은 분·같은 제목이면 기존 초안을 덮어써 계약 위반 |

## 교훈

### 하위 `.gitignore` 를 지울 때는 그것이 무시하던 산출물을 함께 봐야 한다

brain 정리 중 `dashboard/.gitignore` 를 같이 지웠더니, 그 디렉토리의 `.next` **749파일**이 무시 대상에서 풀려 커밋에 딸려 들어갔다. 상위 `.gitignore` 가 같은 패턴을 덮어주지 않으면 빌드 산출물이 통째로 추적된다. push 전이라 `reset` 후 디렉토리를 실물까지 정리하고 재커밋했다.

### 안전 규칙을 강화하면 그 규칙을 어기던 곳이 드러난다 — 그게 파급이다

`paths.ts` 를 "env 없으면 throw" 로 바꾸는 건 한 줄짜리 결정처럼 보였다. 그런데 `getMemoryDir()` 를 **모듈 로드 시점**에 부르는 곳이 2군데 있었고(`memory.ts:63`, `sot-draft/route.ts:9`), 그대로 두면 앱이 통째로 안 뜬다. `memory.ts` 는 문서 기능 전체가 의존하는 모듈이라 라우트가 줄줄이 죽는다.

ARCHITECTURE 문서도, 3라운드 돌린 검증 에이전트도 이걸 못 잡았다. **"throw 로 바꾼다"는 결정은 항상 "누가 언제 부르나"를 함께 봐야 한다.** lazy + memoize 로 전환해 해결했다.

### 린터 버전이 다르면 같은 코드가 다른 판정을 받는다

이관 직후 lint 8건이 떴다. brain/dashboard 에서는 통과하던 코드다. 원인은 `eslint-config-next` 버전 차이였다 — dashboard 16.2.7, 이 레포 16.2.9. 16.2.8+ 가 `react-hooks/set-state-in-effect` 를 강화했다.

즉 **이관이 만든 문제가 아니라 원래 있던 부채가 최신 린터에 드러난 것**이다. 규칙 자체는 React 19 공식 권장이라 회피하지 않고 Phase 3 에서 고친다.

### 지운 것을 누가 부르는지 확인해야 한다

brain PR 머지 검증 중, VHK 의 `check-goal-1.mjs`(Goal 1 완료 게이트)가 삭제한 스크립트와 dashboard 파일을 **네 군데** 참조하는 걸 발견했다. 그대로 머지했으면 게이트가 다음 실행에서 실패했을 것이다.

goal 자체는 DONE 이 맞다 — 산출물이 사라진 게 아니라 소유 레포가 바뀐 것뿐이다. 그래서 게이트를 지우지 않고 **역행 방지 검증**(dashboard 가 brain 에 재유입되면 실패)으로 바꿨다.

## 게이트

| | 결과 |
|---|---|
| typecheck | 통과 |
| build | 통과 — 라우트 33개 |
| test | 10/10 |
| lint | 8 errors 0 warnings (기존 부채, Phase 3) |
| brain `test:run` | 통과 — `check:ecosystem` ALL PASSED 포함 |

## 다음

Phase 3 — UI 5탭 재편 + 이관 제외 5건 삭제 + lint 8건. 셋이 얽혀 있다(제외를 지우면 `page.tsx` 가 깨지고, 어차피 재편 대상이며, lint 3건이 그 파일에 있다).
