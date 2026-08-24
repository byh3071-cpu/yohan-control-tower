#!/usr/bin/env node
// scripts/check-goal-17.mjs — 자동 생성 (vhk goal sync).
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
  console.log('🛑 .vhk/HARD_STOP detected — refusing to run goal 17 gate.')
  process.exit(1)
}

// BOM-safe 읽기: PowerShell Set-Content -Encoding utf8 의 UTF-8 BOM 제거(없으면 throw).
const readJson = (p) => { const t = readFileSync(p, 'utf-8'); return JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t) }
const pkg = existsSync('package.json') ? readJson('package.json') : {}
const scripts = pkg.scripts ?? {}
const pm = existsSync('pnpm-lock.yaml') ? 'pnpm' : existsSync('yarn.lock') ? 'yarn' : 'npm'
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === '1'
let pass = true
const gate = (label, ok) => { console.log('[goal 17] ' + label + ': ' + (ok ? '✓' : '✗')); if (!ok) pass = false }
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

// ─── goal 17 고유 검증 (직접 추가) ───────────────────────────────
const read = (path) => existsSync(path) ? readFileSync(path, 'utf-8') : null
const intake = read('docs/operations/reports/2026-08-23/design-team-intake-status.md')
const incident = read('docs/operations/reports/2026-08-23/orca-runtime-incident.md')
const log = read('docs/log/2026-08-23-design-team-intake-and-runtime-incident.md')

must(intake !== null, '디자인팀 인수 상태 보고서 존재')
must(incident !== null, 'Orca 런타임 사고 보고서 존재')
must(log !== null, 'Goal 17 세션 로그 존재')
must(
  intake?.includes('**부분 수신**') === true &&
    intake.includes('**수신 · BLOCKED**') &&
    intake.includes('P0 1건') &&
    intake.includes('P1 6건') &&
    intake.includes('`not run`') &&
    intake.includes('production 승격 보류'),
  '인수 보고서가 부분·독립 QA 차단·미실행·승격 보류를 구분',
)
must(
  incident?.includes('SEV3') === true &&
    incident.includes('실패 계층별 조사') &&
    incident.includes('CodexSandboxOffline') &&
    incident.includes('sandbox 밖 동일 명령') &&
    incident.includes('앱 재시작 원인: 미확정') &&
    incident.includes('conductor-fallback-investigator'),
  '사고 보고서가 심각도·실패 계층·신원별 A/B·미확정 범위·대체 provenance를 명시',
)
must(
  incident?.includes('[추론, 확신 높음]') === true &&
    incident.includes('effective agent·model·effort가 모두 null') &&
    incident.includes('stop_unverified') &&
    incident.includes('반증 조건') &&
    incident.includes('새 Dispatch를 만들지 않는다'),
  '사고 보고서가 권한·provider 실패의 확신도·반증·중복 방지 게이트를 명시',
)
must(
  !/[A-Z]:\\Users\\/i.test(`${intake ?? ''}\n${incident ?? ''}\n${log ?? ''}`),
  '보고 문서에 개인 절대경로 없음',
)

if (pass) { console.log('✅ goal 17 gate passes'); process.exit(0) }
console.log('❌ goal 17 gate failed'); process.exit(1)
