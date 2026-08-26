#!/usr/bin/env node
// scripts/check-goal-24.mjs — 자동 생성 (vhk goal sync).
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
  console.log('🛑 .vhk/HARD_STOP detected — refusing to run goal 24 gate.')
  process.exit(1)
}

// BOM-safe 읽기: PowerShell Set-Content -Encoding utf8 의 UTF-8 BOM 제거(없으면 throw).
const readJson = (p) => { const t = readFileSync(p, 'utf-8'); return JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t) }
const pkg = existsSync('package.json') ? readJson('package.json') : {}
const scripts = pkg.scripts ?? {}
const pm = existsSync('pnpm-lock.yaml') ? 'pnpm' : existsSync('yarn.lock') ? 'yarn' : 'npm'
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === '1'
let pass = true
const gate = (label, ok) => { console.log('[goal 24] ' + label + ': ' + (ok ? '✓' : '✗')); if (!ok) pass = false }
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

// ─── goal 24 고유 검증 (직접 추가) ───────────────────────────────
const read = (p) => existsSync(p) ? readFileSync(p, 'utf-8') : null
const route = read('src/app/api/run/route.ts') ?? ''
const controller = read('src/lib/run-command-controller.ts') ?? ''
const runner = read('src/lib/run-command-runner.ts') ?? ''
const controllerTest = read('src/lib/run-command-controller.test.ts') ?? ''
const runnerTest = read('src/lib/run-command-runner.test.ts') ?? ''
const routeTest = read('src/lib/run-command-route.test.ts') ?? ''
const goal = read('goals/24-run-command-boundary.md') ?? ''
const backlog = read('BACKLOG.md') ?? ''
const sessionLog = read('docs/log/2026-08-26-run-command-boundary.md') ?? ''

must(route.includes('createRunCommandHandler') && route.includes('createExecFileRunner'), 'route가 controller·runner에 위임')
must(!route.includes('node:child_process') && !route.includes('exec('), 'route의 직접 child_process·shell exec 제거')
must(runner.includes('execFile(') && runner.includes('shell: false'), 'execFile + shell:false 실행 경계')
must(runner.includes('maxBuffer: invocation.options.maxBufferBytes'), 'runner maxBuffer 전달')
must(runner.includes('timeout: invocation.options.timeoutMs'), 'runner timeout 전달')
must(controller.includes('RUN_STDOUT_RESPONSE_CHARS = 2_000') && controller.includes('RUN_STDERR_RESPONSE_CHARS = 500'), '응답 output cap 유지')
must(controller.includes('process.execPath') && controller.includes('`${command}-cli.js`') && controllerTest.includes('npm-cli.js') && controllerTest.includes('npx-cli.js'), 'Windows node.exe + 고정 npm/npx CLI argv')
must(controller.includes('parsed.spec.argv, parsed.url'), 'ingest URL을 별도 단일 argv로 추가')
must(!controller.includes('safeArgs') && !controller.includes('const cmd ='), 'args blacklist·command concat 제거')
must(controller.includes('parsed.username.length > 0') && controller.includes('parsed.password.length > 0'), 'URL credentials 거부')
must(controller.includes('parsed.protocol !== "http:"') && controller.includes('parsed.protocol !== "https:"'), 'HTTP(S) URL allowlist')
must(controller.includes('isJsonContentType') && controllerTest.includes('application/jsonEVIL'), '정확한 JSON media type과 body parse 전 거부 테스트')
must(controller.includes('DISALLOWED_URL_CHARACTERS') && controllerTest.includes('bidi override'), 'URL C0/C1·separator·bidi control 거부 테스트')
must(controller.indexOf('isSameOriginRequest(request)') < controller.indexOf('request.json()'), 'same-origin을 body parse보다 먼저 검사')
must(controller.indexOf('parsed.spec.kind === "human-gate"') < controller.indexOf('dependencies.resolveRepoRoot()'), 'human gate를 cwd resolve보다 먼저 검사')
must(controller.includes('"git:sync": Object.freeze({ kind: "human-gate", humanGate: true })'), 'git:sync 사람 게이트 고정')
must(controller.includes('"sync:notion:push": Object.freeze({ kind: "human-gate", humanGate: true })'), 'sync:notion:push 사람 게이트 고정')
must(controller.includes('COMMAND_TIMEOUT') && controller.includes('COMMAND_OUTPUT_LIMIT') && controller.includes('COMMAND_FAILED'), 'runner 오류 JSON 분류')
must(controller.includes('redactProcessText') && !controller.includes('console.log'), '민감 output redaction·production console.log 부재')
must(controller.includes('UNC_ABSOLUTE_PATH') && controller.includes('POSIX_ABSOLUTE_PATH') && controllerTest.includes('정상 HTTP(S) URL과 route를 보존'), 'URL·route 보존과 cwd/drive/POSIX/UNC 경로 redaction 테스트')
must(controller.includes('JSON_STYLE_SECRET') && controller.includes('Bearer|Basic') && controllerTest.includes('공백 포함 assignment'), 'JSON/assignment/Bearer/Basic/userinfo secret redaction 테스트')
must(controllerTest.includes('shell을 열지 않는다') && controllerTest.includes('POSIX registry') && controllerTest.includes('super-secret-value'), 'controller 주입·명령주입·Windows/POSIX·경로 redaction 테스트')
must(runnerTest.includes('execFile adapter') && runnerTest.includes('output-limit'), 'runner 옵션·오류 분류 테스트')
must(routeTest.includes('production route도 실행 없이') && routeTest.includes('human gate'), '실행 없는 production route 테스트')
must(goal.includes('id: 24') && goal.includes('execution_provider: orca-ready'), 'Goal 24 실행 계약')
must(backlog.includes('해결(Goal 24)') && backlog.includes('`api/run` 출고 잔존 위험') && !backlog.includes('- **`api/run` args 필터**'), 'BACKLOG의 api/run 해소·잔존 위험 기록')
must(sessionLog.includes('## Facts / Inferences / Unknowns') && sessionLog.includes('## Gate Evidence'), '세션 로그 사실·게이트 증거')

if (pass) { console.log('✅ goal 24 gate passes'); process.exit(0) }
console.log('❌ goal 24 gate failed'); process.exit(1)
