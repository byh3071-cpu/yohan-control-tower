#!/usr/bin/env node
// scripts/check-goal-16.mjs — 자동 생성 (vhk goal sync).
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
  console.log('🛑 .vhk/HARD_STOP detected — refusing to run goal 16 gate.')
  process.exit(1)
}

// BOM-safe 읽기: PowerShell Set-Content -Encoding utf8 의 UTF-8 BOM 제거(없으면 throw).
const readJson = (p) => { const t = readFileSync(p, 'utf-8'); return JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t) }
const pkg = existsSync('package.json') ? readJson('package.json') : {}
const scripts = pkg.scripts ?? {}
const pm = existsSync('pnpm-lock.yaml') ? 'pnpm' : existsSync('yarn.lock') ? 'yarn' : 'npm'
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === '1'
let pass = true
const gate = (label, ok) => { console.log('[goal 16] ' + label + ': ' + (ok ? '✓' : '✗')); if (!ok) pass = false }
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

// ─── goal 16 고유 검증 (직접 추가) ───────────────────────────────
const read = (path) => existsSync(path) ? readFileSync(path, 'utf-8') : null
const runbook = read('docs/operations/design-team-supervision-runbook.md')
const skillRequirements = read('docs/operations/supervised-session-skill-requirements.md')

must(runbook !== null, '디자인팀 감독 운영 매뉴얼 존재')
must(skillRequirements !== null, '감독형 멀티세션 스킬 요구사항 존재')
must(
  runbook?.includes('프로젝트 보고서') === true &&
    runbook.includes('worker_done') &&
    runbook.includes('runtime_unavailable') &&
    runbook.includes('보고 상태 기계'),
  '운영 매뉴얼에 이중 영수증·재시작 복구·상태 계약 명시',
)
must(
  runbook?.includes('### 지휘자') === true &&
    runbook.includes('### 디자인팀') &&
    runbook.includes('### 독립 QA 검토자') &&
    runbook.includes('### 장애 조사자'),
  '현재 역할별 할 일 명시',
)
must(
  skillRequirements?.includes('supervised-session-conductor') === true &&
    skillRequirements.includes('restart-safe-handoff') &&
    skillRequirements.includes('runtime-incident-investigator'),
  '신규 스킬 3종의 분리 요구사항 명시',
)
must(
  !/[A-Z]:\\Users\\/i.test(`${runbook ?? ''}\n${skillRequirements ?? ''}`),
  '운영 문서에 개인 절대경로 없음',
)

if (pass) { console.log('✅ goal 16 gate passes'); process.exit(0) }
console.log('❌ goal 16 gate failed'); process.exit(1)
