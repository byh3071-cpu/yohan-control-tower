#!/usr/bin/env node
// scripts/check-goal-25.mjs — 자동 생성 (vhk goal sync).
// 기본 게이트 = typecheck + (lint) + test + build. goal 고유 검증은 아래 구역에 추가.
// sync 재실행해도 기존 파일은 덮어쓰지 않습니다 (idempotent).
//
// Env: VHK_GATES_SKIP_DEEP=1  → test + build 스킵 (빠른 typecheck-only 패스)

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const SHIM = new Set(['pnpm', 'npm', 'npx', 'yarn'])
// cmd.exe /c 래핑 경로는 따옴표+&|<>^% 조합 인자로 인용 경계를 탈출당할 수 있다(CVE-2024-27980
// 과 같은 근본원인 클래스, src/lib/exec.ts 실증) — 위험 문자 있으면 거부(fail-closed).
const CMD_SHELL_METACHARS = /[&|<>^%"\r\n]/
function run(cmd, args) {
  let bin = cmd, argv = args
  if (process.platform === 'win32' && SHIM.has(cmd)) {
    const bad = args.find((a) => CMD_SHELL_METACHARS.test(a))
    if (bad !== undefined) {
      console.log('안전하지 않은 인자 거부 — cmd.exe 특수문자 포함: ' + JSON.stringify(bad))
      return false
    }
    // Windows: .cmd shim 직접 spawn 은 Node CVE-2024-27980 으로 EINVAL → cmd.exe 래핑.
    bin = 'cmd.exe'; argv = ['/d', '/s', '/c', cmd + '.cmd', ...args]
  }
  try {
    // maxBuffer 상향: 큰 빌드/테스트 로그(>1MB)에서 성공해도 ENOBUFS 거짓실패 방지.
    execFileSync(bin, argv, { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
    return true
  } catch (e) {
    const out = (e?.stdout?.toString() ?? '') + (e?.stderr?.toString() ?? '')
    if (out.trim()) console.log(out.split('\n').slice(-25).join('\n'))
    return false
  }
}

if (existsSync('.vhk/HARD_STOP')) {
  console.log('🛑 .vhk/HARD_STOP detected — refusing to run goal 25 gate.')
  process.exit(1)
}

// BOM-safe 읽기: PowerShell Set-Content -Encoding utf8 의 UTF-8 BOM 제거(없으면 throw).
const readJson = (p) => { const t = readFileSync(p, 'utf-8'); return JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t) }
const pkg = existsSync('package.json') ? readJson('package.json') : {}
const scripts = pkg.scripts ?? {}
const pm = existsSync('pnpm-lock.yaml') ? 'pnpm' : existsSync('yarn.lock') ? 'yarn' : 'npm'
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === '1'
let pass = true
const gate = (label, ok) => { console.log('[goal 25] ' + label + ': ' + (ok ? '✓' : '✗')); if (!ok) pass = false }
const must = (cond, label) => { console.log((cond ? '    ✓ ' : '    ✗ ') + label); if (!cond) pass = false }

// typecheck (스크립트 우선, 없으면 tsc --noEmit)
if (scripts.typecheck) gate('typecheck', run(pm, ['run', 'typecheck']))
else if (existsSync('tsconfig.json')) gate('tsc --noEmit', run(pm, pm === 'npm' ? ['exec', '--', 'tsc', '--noEmit'] : ['exec', 'tsc', '--noEmit']))
if (scripts.lint) gate('lint', run(pm, ['run', 'lint']))
if (!skipDeep) {
  if (scripts['test:run']) gate('test', run(pm, ['run', 'test:run']))
  else if (scripts.test && /vitest/.test(scripts.test)) gate('test', run(pm, ['run', 'test', '--', '--run']))
  else if (scripts.test) gate('test', run(pm, ['run', 'test']))
  if (scripts.build) gate('build', run(pm, ['run', 'build']))
}

// ─── goal 25 고유 검증 (직접 추가) ───────────────────────────────
const read = (p) => existsSync(p) ? readFileSync(p, 'utf-8') : null
const route = read('src/app/api/search/route.ts') ?? ''
const controller = read('src/lib/search-controller.ts') ?? ''
const controllerTest = read('src/lib/search-controller.test.ts') ?? ''
const response = read('src/lib/search-response.ts') ?? ''
const responseTest = read('src/lib/search-response.test.ts') ?? ''
const palette = read('src/components/command-palette.tsx') ?? ''
const goal = read('goals/25-search-failure-boundary.md') ?? ''
const backlog = read('BACKLOG.md') ?? ''
const sessionLog = read('docs/log/2026-08-26-search-failure-boundary.md') ?? ''

must(scripts['check:goal-25'] === 'node scripts/check-goal-25.mjs', 'package script가 Goal 25 checker를 고정')
must(route.includes('createSearchHandler') && route.includes('fetchUpstream'), 'production route가 주입 가능한 search controller에 연결')
must(!route.includes('choices?.') && !route.includes('JSON.parse(content'), 'production route에서 AI parsing 제거')
must(controller.includes('method: "keyword"') && controller.includes('method: "keyword-fallback"'), 'no-key keyword·HTTP non-ok fallback 보존')
must(controller.includes('AI_RESPONSE_INVALID') && controller.includes('return invalidAiResponse()'), 'AI 200 해석 실패의 안전한 502 경계')
must(controller.includes('extractTopLevelArrayCandidates') && controller.includes('arrayTexts.length !== 1'), 'balanced top-level 배열 후보 정확히 1개 추출')
must(controller.includes('Number.isInteger(index)') && controller.includes('new Set(parsed).size') && controller.includes('MAX_AI_RESULTS = 5'), 'index 정수·중복·최대 5개 닫힌 검증')
must(controller.includes('index >= 0 && index < docCount'), 'index 문서 범위 검증')
must(controller.includes('candidateDocs = docs.slice(0, MAX_AI_DOCS)') && controller.includes('parseAiIndices(content, candidateDocs.length)') && controller.includes('candidateDocs[index]'), 'prompt·범위 검증·결과 매핑의 동일 candidateDocs slice')
must(!controller.includes('console.log') && !controller.includes('console.error'), 'upstream 원문 로그 없음')
must(controllerTest.includes('기존 keyword 검색을 보존') && controllerTest.includes('keyword-fallback 성공 동작을 보존'), '기존 keyword 성공 경로 단위 검증')
must(controllerTest.includes('직접 배열·문장 속 배열·빈 배열') && controllerTest.includes('AI_RESPONSE_INVALID'), 'AI 성공 0건과 실패 분리 단위 검증')
must(controllerTest.includes('[[0,1]]') && controllerTest.includes('[[[2]]]') && controllerTest.includes('[ [0, 1] ]') && controllerTest.includes('후보 [0] 또는 [1]'), '중첩·공백 중첩·복수 top-level 배열 반례 단위 검증')
must(controllerTest.includes('candidateDocs 80개') && controllerTest.includes('[79]') && controllerTest.includes('[80]') && controllerTest.includes('[90]'), 'prompt 노출 범위 79 성공·80/90 실패 단위 검증')
must(controllerTest.includes('raw-private-value') && controllerTest.includes('assert.doesNotMatch'), 'raw upstream·개인 경로 비노출 검증')
must(controllerTest.includes('malformed JSON은 명시적 400') && controllerTest.includes('잘못된 query는 기존 400') && controllerTest.includes('fetchCalls: 0'), 'malformed JSON 명시적 400·query 400 회귀·외부 호출 0회 검증')
must(response.includes('parseSearchClientResponse') && response.includes('SEARCH_METHODS'), '공유 client parser와 method allowlist')
must(palette.includes('parseSearchClientResponse') && !palette.includes('data?.error') && !palette.includes('Array.isArray(data.results)'), 'palette가 안전한 parser 결과로 오류 분기')
must(responseTest.includes('정상 AI 빈 배열') && responseTest.includes('API 실패는 정상 AI 0건과 다른'), 'client 정상 0건·오류 분기 단위 검증')
must(goal.includes('id: 25') && goal.includes('size: L') && goal.includes('execution_provider: orca-ready') && goal.includes('automatic_fallback: false'), 'Goal 25 실행 계약')
must(backlog.includes('해결(Goal 25)') && backlog.includes('`api/search` 출고 잔존 위험 (Goal 25 P2)'), 'BACKLOG 해결·잔존 위험 기록')
must(backlog.includes('command palette 응답 순서 fence 부재 (Goal 25 범위 밖 P2)'), 'BACKLOG command palette 응답 순서 잔존 위험 기록')
must(sessionLog.includes('## Reviewer P1 Correction') && sessionLog.includes('## Gate Evidence') && sessionLog.includes('## Context Regeneration'), '세션 로그 reviewer 교정·게이트·context 분류')

if (pass) { console.log('✅ goal 25 gate passes'); process.exit(0) }
console.log('❌ goal 25 gate failed'); process.exit(1)
