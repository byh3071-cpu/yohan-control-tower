---
id: TS-001
제목: vhk doctor 가 AGENTS.md 드리프트를 항상 오탐
발견일: 2026-07-28
발견경로: yohan-control-tower vhk init 독푸딩
대상: "@byh3071/vhk@2.12.0"
심각도: low   # 오탐일 뿐 데이터 손상 없음. 다만 "sync 다시 실행" 안내가 무한 반복돼 경고 피로 유발
상태: 미수정   # 크로스레포(vhk) 변경 = 하드 트리거 L → 별도 티켓
태그: [vhk, drift, false-positive, dogfooding]
---

# TS-001 — `vhk doctor` 가 AGENTS.md 드리프트를 항상 오탐

## 증상

`vhk sync` 를 방금 실행해 산출물이 최신인데도 `vhk doctor` 가 계속 경고한다.

```
🔀 드리프트 점검 (규칙·맥락 어긋남):
  ⚠️ RULES.md와 어긋난 규칙 파일: AGENTS.md — vhk sync 를 다시 실행하세요
```

`vhk sync` 를 몇 번 다시 돌려도 사라지지 않는다. 같은 상태에서 `vhk sync --check` 는 **정상**이라고 답한다.

```
✅ 규칙 동기화 상태 — sync 산출 전부(RULES 미러 + bootstrap) 일치
```

두 명령의 판정이 서로 모순된다.

## 재현 조건

- `RULES.md` 가 있고 `vhk sync` 를 실행한 레포
- **`docs/context/agent-compact.md` 와 `AGENTS.compact.md` 가 둘 다 없을 것**

이 조건은 `vhk init` 직후 기본 상태다. 즉 대부분의 레포에서 재현된다.
(실측: `yohan-control-tower`, `yohan-voice` 모두 두 파일 없음)

## 원인

`AGENTS.md` 생성기 `toAgentsMd()` 는 `compactRel` 인자로 compact 안내 줄의 출력 여부를 정한다.

`vhk/src/commands/sync.ts:424-456`
```ts
export function toAgentsMd(
  sections: RulesSection[],
  projectName: string,
  /** null = compact 안내 생략. undefined = 레거시 테스트 기본(경로 문자열 포함). */
  compactRel: string | null | undefined = 'docs/context/agent-compact.md',
  rootDir?: string,
): string {
  ...
  if (compactRel !== null) {
    lines.push(`> 빠른 시작(토큰 절감): \`${compactRel ?? 'docs/context/agent-compact.md'}\` 를 먼저 읽으세요.`)
  }
```

`sync` 는 파일 존재를 실측해서 넘긴다 — 없으면 `null` 이라 안내 줄을 **생략**한다.

`vhk/src/commands/sync.ts:388-394`
```ts
/** AGENTS.md compact 포인터 대상 — repo 에 실제 있을 때만 sync 가 안내 줄을 넣는다. */
export function resolveAgentCompactRel(rootDir: string): string | null {
  for (const rel of ['docs/context/agent-compact.md', 'AGENTS.compact.md']) {
    if (fs.existsSync(path.join(rootDir, rel))) return rel
  }
  return null
}
```

반면 드리프트 검사는 `SYNC_TARGETS[].generate` 를 **2인자로만** 호출한다. `compactRel` 이 `undefined` 가 되어 **기본값이 적용**되고, 결과적으로 expected 에는 안내 줄이 **포함**된다.

`vhk/src/lib/drift.ts:46`
```ts
const expected = normalizeForCompare(target.generate(sections, projectName))
const actual = normalizeForCompare(fs.readFileSync(fullPath, 'utf-8'))
results.push({ path: target.path, status: expected === actual ? 'ok' : 'drifted' })
```

`SyncTarget.generate` 의 타입 자체가 2인자라 3·4번째 인자를 전달할 자리가 없다 (`sync.ts:503`).

```ts
generate: (sections: RulesSection[], projectName: string) => string
```

`toAgentsMd` 만 이 계약보다 넓은 시그니처(4인자)를 갖고 있고, 나머지 6개 타겟은 2인자라 영향받지 않는다. 그래서 **AGENTS.md 하나만** 드리프트로 뜬다.

정리하면:

| | compact 안내 줄 |
|---|---|
| `sync` 가 실제로 쓴 AGENTS.md | 없음 (파일 부재 → `null`) |
| `doctor` 가 기대하는 AGENTS.md | 있음 (기본값 적용) |

→ `expected !== actual` → 항상 `drifted`.

## 영향

- 데이터 손상 없음. 파일은 정상이다.
- `vhk doctor` 경고가 영구적으로 남아 **진짜 드리프트를 가린다** (경고 피로).
- `vhk doctor --strict` 를 게이트로 쓰면 통과 불가.

## 우회

1. `vhk sync --check` 로 판정한다 (이쪽이 정확).
2. 또는 `docs/context/agent-compact.md` 를 만들면 양쪽 판정이 일치한다 — 다만 실제로 안 쓰는 파일을 만드는 셈이라 권장하지 않는다.

## 근본 수정 (vhk 레포 — 별도 티켓)

`SyncTarget.generate` 에 `rootDir` 을 넘기도록 계약을 넓히고, `drift.ts` 가 `sync` 와 같은 인자로 호출하게 한다.

```ts
// sync.ts
generate: (sections: RulesSection[], projectName: string, rootDir?: string) => string

// drift.ts:46
const expected = normalizeForCompare(target.generate(sections, projectName, rootDir))

// toAgentsMd — rootDir 이 있으면 실측으로 compactRel 을 스스로 해석
const resolved = rootDir !== undefined ? resolveAgentCompactRel(rootDir) : compactRel
```

회귀 테스트: compact 파일이 **없는** 픽스처에서 `checkRuleDrift()` 가 `AGENTS.md → ok` 를 반환하는지 검증한다. 현재 테스트가 이 케이스를 안 덮고 있어서 GA 까지 살아남았다.

## 교훈

같은 산출물을 **두 코드 경로가 각자 재계산**하면 언젠가 갈라진다. 생성기와 검증기는 반드시 **같은 입력**을 받아야 한다. `sync` 는 디스크를 실측했고 `drift` 는 기본값을 믿었다 — 그 차이 하나가 영구 오탐이 됐다.
