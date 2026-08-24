#!/usr/bin/env node
// scripts/check-goal-19.mjs — 자동 생성 (vhk goal sync).
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

function capture(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (e) {
    const out = (e?.stdout?.toString() ?? '') + (e?.stderr?.toString() ?? '')
    if (out.trim()) console.log(out.split('\n').slice(-25).join('\n'))
    return null
  }
}

function rejects(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'ignore'], maxBuffer: 4 * 1024 * 1024 })
    return false
  } catch {
    return true
  }
}

if (existsSync('.vhk/HARD_STOP')) {
  console.log('🛑 .vhk/HARD_STOP detected — refusing to run goal 19 gate.')
  process.exit(1)
}

// BOM-safe 읽기: PowerShell Set-Content -Encoding utf8 의 UTF-8 BOM 제거(없으면 throw).
const readJson = (p) => { const t = readFileSync(p, 'utf-8'); return JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t) }
const pkg = existsSync('package.json') ? readJson('package.json') : {}
const scripts = pkg.scripts ?? {}
const pm = existsSync('pnpm-lock.yaml') ? 'pnpm' : existsSync('yarn.lock') ? 'yarn' : 'npm'
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === '1'
let pass = true
const gate = (label, ok) => { console.log('[goal 19] ' + label + ': ' + (ok ? '✓' : '✗')); if (!ok) pass = false }
const must = (cond, label) => { console.log((cond ? '    ✓ ' : '    ✗ ') + label); if (!cond) pass = false }
const read = (path) => existsSync(path) ? readFileSync(path, 'utf-8') : null

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

// ─── goal 19 고유 검증 ───────────────────────────────────────────
const healthScript = read('scripts/check-agent-session-health.mjs')
const recoveryScript = read('scripts/recover-orca-stale-repos.mjs')
const visibilityScript = read('scripts/set-orca-repo-visibility.mjs')
const runbook = read('docs/operations/agent-session-recovery-runbook.md')
const workstreams = read('docs/operations/current-workstreams.md')
const sessionLog = read('docs/log/2026-08-23-agent-session-runtime-recovery.md')

must(Boolean(healthScript), '세션 health check 존재')
must(healthScript?.includes('contentRead: false'), 'rollout 본문 미열람 계약')
must(healthScript?.includes('spawn git ENOENT'), '누락 cwd ENOENT 탐지')
must(Boolean(recoveryScript), 'stale repo 결정론적 dry-run 존재')
must(recoveryScript?.includes('--confirm-offline-copy'), 'stale repo offline apply 명시 확인')
must(visibilityScript?.includes('--confirm-offline-copy'), 'visibility offline apply 명시 확인')
must(scripts['session:health'] === 'node scripts/check-agent-session-health.mjs', 'package session:health 진입점')
must(runbook?.includes('orca project setup-delete'), '공식 Orca 정리 경로 문서화')
must(runbook?.includes('restart-safe-handoff'), '범용 재시작 인계 스킬 포인터')
must(workstreams?.includes('NOW_R3_IMPLEMENTED_VERIFIED'), '디자인 세션 완료·검증 상태')
must(workstreams?.includes('dirty 37파일'), '메인 새 세션 ACK 상태')
must(Boolean(sessionLog), 'Goal 19 세션 로그 존재')

const recoveryOutput = capture(process.execPath, [
  'scripts/recover-orca-stale-repos.mjs',
  '--data=fixtures/orca-stale-repos/orca-data.json',
])
let recoveryFixture = null
try { recoveryFixture = recoveryOutput ? JSON.parse(recoveryOutput) : null } catch { recoveryFixture = null }
must(recoveryFixture?.staleCount === 1, 'stale repo fixture 1건 탐지')
must(recoveryFixture?.after?.repos === 0, 'stale repo fixture 정리 결과 0건')
must(recoveryFixture?.residualReferences?.[0]?.count === 0, 'stale repo fixture 잔여 참조 0')
must(rejects(process.execPath, [
  'scripts/recover-orca-stale-repos.mjs',
  '--data=fixtures/orca-stale-repos/orca-data.json',
  '--apply',
  '--expect-count=1',
  `--expect-digest=${recoveryFixture?.targetDigest ?? ''}`,
]), '확인 없는 offline apply fail-closed')

const healthOutput = capture(process.execPath, [
  'scripts/check-agent-session-health.mjs',
  '--orca-root=fixtures/agent-session-health',
  '--now=2001-09-09T01:47:40.000Z',
  '--window-minutes=10',
  '--warn-mb=0.000001',
  '--critical-mb=0.000002',
  '--skip-memory',
  '--json',
])
let healthFixture = null
try { healthFixture = healthOutput ? JSON.parse(healthOutput) : null } catch { healthFixture = null }
must(healthFixture?.status === 'critical', '대형 rollout fixture critical 판정')
must(healthFixture?.rollouts?.contentRead === false, 'fixture에서도 rollout 본문 미열람')
must(healthFixture?.missingCwdErrors?.recentCount === 1, '최근 누락 cwd fixture 탐지')
must(healthFixture?.missingCwdErrors?.coverageIncomplete === false, 'fixture trace 시간창 coverage 완전')

if (pass) { console.log('✅ goal 19 gate passes'); process.exit(0) }
console.log('❌ goal 19 gate failed'); process.exit(1)
