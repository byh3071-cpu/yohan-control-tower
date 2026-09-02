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
const dailyVisual = read('src/lib/daily-visual.ts') ?? ''
const dailyTest = read('src/lib/daily-visual.test.ts') ?? ''
const calendarView = read('src/components/calendar-view.tsx') ?? ''
const workView = read('src/components/work-view.tsx') ?? ''
const globals = read('src/app/globals.css') ?? ''
const calendarRouteTest = read('src/lib/calendar-route.test.ts') ?? ''
const goal = read('goals/25-calendar-daily-visual.md') ?? ''

must(dailyVisual.includes('export const DAILY_VISUAL') && dailyVisual.includes('#f0a3b0') && dailyVisual.includes('buildQuickAddTaskInput') && dailyVisual.includes('pillColorForKind'), 'daily-visual 토큰 SoT와 kind·빠른 추가 helper')
must(globals.includes('[data-surface="daily"]') && globals.includes('--daily-rose:') && globals.includes('--daily-pill-cyan:'), '[data-surface=daily] CSS 변수')
must(calendarView.includes('from "@/lib/daily-visual"') && workView.includes('from "@/lib/daily-visual"'), 'Calendar·Work가 daily-visual만 import')
must(calendarView.includes('buildQuickAddTaskInput(selectedDate, quickTitle)') && calendarView.includes('if (!input) return') && dailyVisual.includes('kind: "task"'), '빠른 추가가 빈 제목을 거절하고 task만 생성')
must(calendarView.includes('action: "set_task_completion"') && calendarView.includes('method: "PATCH"') && !calendarView.includes('/api/todos') && !calendarView.includes('/api/goals'), '원형 체크 완료는 Calendar PATCH만')
must(!calendarView.includes('개인일정') && !calendarView.includes('data-category') && !/col-span-[2-4]/.test(calendarView), '카테고리 점 줄·다가 span 마크업 없음')
must(calendarView.includes('<h1') && calendarView.includes('formatSelectedDate') && workView.includes('isDailyCalendar') && workView.includes('"data-surface": DAILY_SURFACE'), '일정 H1은 선택일, Work calendar는 daily surface')
must(calendarView.includes('data-daily-add') && globals.includes('.daily-add'), '주요 추가 표적 daily-add')
must(dailyTest.includes('buildQuickAddTaskInput') && dailyTest.includes('pillColorForKind') && calendarRouteTest.includes('set_task_completion'), '빠른 추가·kind pill 단위 테스트와 calendar route 회귀 고정')
must(goal.includes('일정 일상 표면 시각과 빠른 추가'), 'Goal 25 문서 존재')

if (pass) { console.log('✅ goal 25 gate passes'); process.exit(0) }
console.log('❌ goal 25 gate failed'); process.exit(1)
