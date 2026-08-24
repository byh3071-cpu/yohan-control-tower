#!/usr/bin/env node
// scripts/check-goal-18.mjs — 자동 생성 (vhk goal sync).
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
  console.log('🛑 .vhk/HARD_STOP detected — refusing to run goal 18 gate.')
  process.exit(1)
}

// BOM-safe 읽기: PowerShell Set-Content -Encoding utf8 의 UTF-8 BOM 제거(없으면 throw).
const readJson = (p) => { const t = readFileSync(p, 'utf-8'); return JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t) }
const pkg = existsSync('package.json') ? readJson('package.json') : {}
const scripts = pkg.scripts ?? {}
const pm = existsSync('pnpm-lock.yaml') ? 'pnpm' : existsSync('yarn.lock') ? 'yarn' : 'npm'
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === '1'
let pass = true
const gate = (label, ok) => { console.log('[goal 18] ' + label + ': ' + (ok ? '✓' : '✗')); if (!ok) pass = false }
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

// ─── goal 18 고유 검증 (직접 추가) ───────────────────────────────
const read = (path) => existsSync(path) ? readFileSync(path, 'utf-8') : null
const board = read('docs/operations/current-workstreams.md')
const log = read('docs/log/2026-08-23-workstream-control-and-session-reconciliation.md')

must(board !== null, '현재 작업흐름 관제 보드 존재')
must(log !== null, 'Goal 18 세션 로그 존재')
must(
  board?.includes('| 메인 제품 |') === true &&
    board.includes('| 디자인 |') &&
    board.includes('| 스킬 |') &&
    board.includes('단일 다음 행동') &&
    board.includes('하드게이트'),
  '메인·디자인·스킬에 owner·다음 행동·하드게이트 명시',
)
must(
  board?.includes('`tower-workbench` Goal 14 세션') === true &&
    board.includes('미커밋 구현') &&
    board.includes('디자인 worktree가 dirty') &&
    board.includes('release 금지'),
  'dirty 산출물을 종료·release보다 먼저 보존',
)
must(
  board?.includes('Goal 13 재검수 worker') === true &&
    board.includes('`release_unknown`') &&
    board.includes('exact worker `exited`') &&
    board.includes('residual resources `[]`'),
  'worker 정산 성공 범위와 stop 확인 실패를 분리',
)
must(
  board?.includes('`agent_prompt_stalled`') === true &&
    log?.includes('terminal 화면에서 두 요청 수신') === true,
  'RPC 전송 결과와 실제 terminal 수신을 교차검증',
)
must(
  board?.includes('P0 1, P1 6') === true &&
    board.includes('production handoff 금지') &&
    board.includes('중복 지시 금지'),
  '디자인 차단 결함과 독립 세션 비간섭 조건 유지',
)
const hasPendingAgentKitGate =
  board?.includes('`G0_HUMAN_GATE`') === true &&
  board.includes('PR #79 대체 병합 증거') &&
  board.includes('Goal 8만 IN_PROGRESS') &&
  board.includes('G0 전 파일·Goal 수정 금지')
const hasReconciledAgentKitGate =
  board?.includes('`G0_RECONCILED_GOAL8_PENDING`') === true &&
  board.includes('PR #74 `CLOSED`') &&
  board.includes('Goal 5·10 `DONE`, Goal 8 `IN_PROGRESS`') &&
  board.includes('G0에 포함되지 않았으며 다시 별도 사람 게이트')
must(
  hasPendingAgentKitGate || hasReconciledAgentKitGate,
  'Agent Kit Goal 충돌·대체 증거·G0 외부 변경 게이트 명시',
)
must(
  !/[A-Z]:\\Users\\/i.test(`${board ?? ''}\n${log ?? ''}`),
  '운영 문서에 개인 절대경로 없음',
)

if (pass) { console.log('✅ goal 18 gate passes'); process.exit(0) }
console.log('❌ goal 18 gate failed'); process.exit(1)
