import assert from "node:assert/strict"
import test from "node:test"

import {
  inspectFileName,
  inspectTypeScriptSource,
} from "./project-policy.js"

test("VHK 오탐 토큰과 test 역할 접미사는 정책 위반이 아니다", () => {
  const source = `
const root = process.env.YOHAN_OS_ROOT
const signal = AbortSignal.any([])
const filter = { match: { any: [] } }
`

  assert.deepEqual(inspectTypeScriptSource("src/lib/example.test.ts", source), [])
  assert.deepEqual(inspectFileName("src/lib/knowledge-review-controller.test.ts"), [])
})

test("TypeScript AST의 명시적 any만 fail-closed로 차단한다", () => {
  const violations = inspectTypeScriptSource("src/lib/example.ts", "const value: any = input")

  assert.equal(violations.length, 1)
  assert.equal(violations[0]?.kind, "explicit-any")
  assert.equal(violations[0]?.line, 1)
})

test("운영 소스의 개인·시스템 절대경로 문자열을 차단한다", () => {
  const windows = inspectTypeScriptSource(
    "src/lib/windows-path.ts",
    String.raw`const root = "C:\Users\person\project"`,
  )
  const posix = inspectTypeScriptSource(
    "src/lib/posix-path.ts",
    'const root = "/home/person/project"',
  )
  const unc = inspectTypeScriptSource(
    "src/lib/unc-path.ts",
    String.raw`const root = "\\\\server\\share"`,
  )

  assert.equal(windows[0]?.kind, "absolute-path")
  assert.equal(posix[0]?.kind, "absolute-path")
  assert.equal(unc[0]?.kind, "absolute-path")
})

test("테스트 fixture의 절대경로 예시는 운영 하드코딩과 분리한다", () => {
  const violations = inspectTypeScriptSource(
    "src/lib/project-policy.test.ts",
    String.raw`const fixture = "C:\Users\person\project"`,
  )

  assert.deepEqual(violations, [])
})

test("PascalCase 파일은 막고 kebab-case와 test 접미사는 허용한다", () => {
  assert.equal(inspectFileName("src/components/vector/CollectionStatus.tsx")[0]?.kind, "filename")
  assert.deepEqual(inspectFileName("src/components/vector/collection-status.tsx"), [])
  assert.deepEqual(inspectFileName("src/lib/project-policy.test.ts"), [])
})
