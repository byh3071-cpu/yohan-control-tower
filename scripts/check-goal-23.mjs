#!/usr/bin/env node
// scripts/check-goal-23.mjs — 자동 생성 (vhk goal sync).
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
  console.log('🛑 .vhk/HARD_STOP detected — refusing to run goal 23 gate.')
  process.exit(1)
}

// BOM-safe 읽기: PowerShell Set-Content -Encoding utf8 의 UTF-8 BOM 제거(없으면 throw).
const readJson = (p) => { const t = readFileSync(p, 'utf-8'); return JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t) }
const pkg = existsSync('package.json') ? readJson('package.json') : {}
const scripts = pkg.scripts ?? {}
const pm = existsSync('pnpm-lock.yaml') ? 'pnpm' : existsSync('yarn.lock') ? 'yarn' : 'npm'
const skipDeep = process.env.VHK_GATES_SKIP_DEEP === '1'
let pass = true
const gate = (label, ok) => { console.log('[goal 23] ' + label + ': ' + (ok ? '✓' : '✗')); if (!ok) pass = false }
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

// ─── goal 23 고유 검증 (직접 추가) ───────────────────────────────
const read = (p) => existsSync(p) ? readFileSync(p, 'utf-8') : null
const viewTabs = read('src/components/view-tabs.tsx') ?? ''
const workView = read('src/components/work-view.tsx') ?? ''
const workNavigation = read('src/lib/work-navigation.ts') ?? ''
const workItems = read('src/lib/work-items.ts') ?? ''
const goalTasks = read('src/lib/goal-tasks.ts') ?? ''
const todoView = read('src/components/todo-view.tsx') ?? ''
const projectView = read('src/components/project-view.tsx') ?? ''
const responsiveDialog = read('src/components/use-responsive-dialog.ts') ?? ''
const calendarView = read('src/components/calendar-view.tsx') ?? ''
const calendarRoute = read('src/app/api/calendar/route.ts') ?? ''
const projectRoutes = [
  read('src/app/api/projects/route.ts') ?? '',
  read('src/app/api/projects/[slug]/route.ts') ?? '',
]
const qa = read('docs/design/control-tower-vnext/work-screen/design-qa.md')
const qaResults = existsSync('docs/design/control-tower-vnext/work-screen/browser-qa-results.json')
  ? readJson('docs/design/control-tower-vnext/work-screen/browser-qa-results.json')
  : null

must((viewTabs.match(/\{ id: "/g) ?? []).length === 5 && viewTabs.includes('id: "projects", label: "작업"'), '상위 5탭과 projects 슬롯의 작업 전환')
must(workView.includes('"todo"') && workView.includes('"calendar"') && workView.includes('"projects"'), 'WorkView가 세 형제 보기를 소유')
must(workNavigation.includes('view') && workNavigation.includes('surface') && workNavigation.includes('SAFE_ITEM_PAYLOAD') && workNavigation.includes('payload.split("/")') && workNavigation.includes('surface === "calendar" && source !== "calendar"') && workNavigation.includes('resolveCalendarViewState') && workNavigation.includes('export function seoulDate'), 'work URL item allowlist와 Calendar optional-state·주입 가능 서울 clock 계약')
must(goalTasks.includes('stableTodoId(relPath, check.text, check.line)'), '동일 문구 Completion Check line discriminator 계약')
must(workItems.includes('item.source !== "calendar"') && workItems.includes('set_task_completion'), 'Calendar-only 완료 요청 경계')
must(['"now"', '"today"', '"upcoming"', '"waiting"'].every((key) => workItems.includes(key)) && todoView.includes('오늘 일정') && todoView.includes('setToday(from)'), 'Todo 승인 그룹·오늘 일정·refresh 서울 날짜 갱신 구조')
must(todoView.includes('data-work-dialog-backdrop="todo"') && projectView.includes('data-work-dialog-backdrop="projects"') && responsiveDialog.includes('!container.contains(document.activeElement)'), '1023px 이하 modal backdrop·양방향 focus trap 계약')
must(todoView.includes('activeRequestRef.current?.controller.abort()') && todoView.includes('canCommitWorkResponse(requestId, requestSequenceRef.current, controller.signal.aborted)'), 'Todo refresh abort·request-id 최신 응답 fence 계약')
must(calendarView.includes('activeRequestRef.current?.controller.abort()') && calendarView.includes('rangeState.key === rangeKey') && calendarView.includes('dismissedSelectionRef'), 'Calendar authoritative range·cancellation·URL dialog 동기화 계약')
must(calendarView.includes('finalFocus={resolveEditFinalFocus}') && calendarView.includes('if (trigger?.isConnected) return trigger') && calendarView.includes('return fallback?.isConnected ? fallback : false') && calendarView.includes('data-calendar-focus-fallback'), 'Calendar edit dialog 종료의 연결 trigger 우선·안전 fallback focus 계약')
must(calendarRoute.includes('isSameOriginRequest') && calendarRoute.includes('CalendarConflictError ? 409'), 'Calendar same-origin·409 경계 보존')
must(projectRoutes.every((source) => /export\s+async\s+function\s+GET\b/.test(source) && !/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(source)), 'Project API GET-only 유지')
must(qa?.trimEnd().endsWith('final result: passed') === true, 'work-screen design-qa가 passed로 끝남')
must(
  qaResults?.summary?.overflowFailures === 0 &&
    qaResults?.summary?.doubleScrollFailures === 0 &&
    qaResults?.summary?.h1Failures === 0 &&
    qaResults?.summary?.targetFailures === 0 &&
    qaResults?.summary?.portalTargetFailures === 0 &&
    qaResults?.summary?.consoleErrors === 0 &&
    qaResults?.summary?.minimumParagraphPx >= 14 &&
    qaResults?.browser?.product &&
    qaResults?.browser?.userAgent,
  '실브라우저 5 viewport·상태 matrix 품질 수치 통과',
)
must(
  qaResults?.interactionAssertions &&
    Object.values(qaResults.interactionAssertions).length >= 67 &&
    Object.values(qaResults.interactionAssertions).every((value) => value === true),
  '형제 history·refresh·range race·backdrop·Calendar save 실브라우저 assertion 통과',
)
must(
  qaResults?.accessibility?.calendarPortalTargets?.total >= 1 &&
    qaResults.accessibility.calendarPortalTargets.measurements?.length === qaResults.accessibility.calendarPortalTargets.total &&
    qaResults.accessibility.calendarPortalTargets.measurements.every((item) => item.width >= 44 && item.height >= 44) &&
    qaResults?.refreshRestore?.after?.item?.startsWith('goal:yohan-control-tower/goals/23-work-sibling-views.md#'),
  'Portal 실제 bounding rect와 project-prefixed production-shaped key refresh raw evidence',
)
must(
  qaResults?.saveClose?.historyLengthBefore === qaResults?.saveClose?.historyLengthAfter &&
    qaResults?.saveClose?.itemAfter === null &&
    qaResults?.saveClose?.dialogOpenAfter === false &&
    qaResults?.saveClose?.activeEditIdAfter === 'task-1@2026-08-25' &&
    qaResults?.keyboard?.calendar?.validSelectionBackClose?.item === null &&
    qaResults?.keyboard?.calendar?.validSelectionBackClose?.activeEditId,
  'Calendar save replace와 valid-selection Back close·focus raw evidence',
)
must(
  qaResults?.keyboard?.calendar?.userCloseFocus?.activeEditId === 'task-1@2026-08-25' &&
    qaResults?.keyboard?.calendar?.userCloseFocus?.fallbackFocused === false &&
    qaResults?.keyboard?.calendar?.movedTriggerFallback?.originalTriggerConnected === false &&
    qaResults?.keyboard?.calendar?.movedTriggerFallback?.fallbackFocused === true,
  'Calendar user close의 원래 trigger focus와 이동으로 trigger가 사라질 때 fallback raw evidence',
)
must(
  qaResults?.crossMonthRestore?.octoberPendingBeforeBack?.item?.includes('task-2@2026-10-20') &&
    qaResults?.crossMonthRestore?.octoberPendingBeforeBack?.loadingVisible === true &&
    qaResults?.crossMonthRestore?.augustAfterLateOctober?.item?.includes('task-1@2026-08-25') &&
    qaResults?.crossMonthRestore?.currentOctoberRelease?.fulfilled >= 1 &&
    qaResults?.crossMonthRestore?.octoberAfterResolve?.item?.includes('task-2@2026-10-20'),
  'Calendar cross-month Back·Forward delayed response raw evidence',
)
must(
  ['todo', 'projects'].every((surface) => {
    const mobile = qaResults?.accessibility?.sheet360?.[surface]
    const tablet = qaResults?.accessibility?.sheet768?.[surface]
    return mobile?.geometry?.sheet?.width === 360 && mobile?.geometry?.backdrop?.width === 360 && mobile?.pointerProbe?.backgroundClicks === 0 && mobile?.afterBackdrop?.focusReturned === true &&
      tablet?.geometry?.sheet?.width === 420 && tablet?.geometry?.backdrop?.width === 768 && tablet?.afterBackdrop?.backgroundClicks === 0 && tablet?.afterBackdrop?.focusReturned === true
  }),
  '360·768 Todo·Project backdrop viewport·pointer isolation·close·focus와 768 sheet 폭 raw evidence',
)
must(
  qaResults?.keyEvidence?.parsedUnicodeItem === qaResults?.keyEvidence?.requestedUnicodeItem &&
    qaResults?.keyEvidence?.duplicateRows?.length === 2 &&
    qaResults?.keyEvidence?.distinctDuplicateKeys === 2 &&
    qaResults?.keyEvidence?.parserProduced?.length === 2 &&
    qaResults.keyEvidence.parserProduced.every((item) => qaResults.keyEvidence.duplicateRows.some((row) => row.key === item.renderedKey)),
  '한글·공백 item round-trip과 parser-produced 동일 Completion Check 고유 key→render raw evidence',
)
must(
  qaResults?.navigation?.noQueryParent?.search === '' &&
    qaResults?.navigation?.noQueryParent?.activeTopTab?.includes('홈') &&
    qaResults?.navigation?.noQueryParent?.workShellPresent === false &&
    qaResults?.navigation?.calendarOptionalState?.bothFieldRemoval?.afterBack?.mode === 'month' &&
    qaResults?.navigation?.calendarOptionalState?.modeFieldRemoval?.afterBack?.mode === 'month' &&
    qaResults?.navigation?.calendarOptionalState?.dateFieldRemoval?.afterBack?.date === qaResults?.navigation?.calendarOptionalState?.browserToday,
  'no-query NOW와 Calendar Back/Forward optional date·mode 독립 reset raw evidence',
)
must(
  qaResults?.navigation?.calendarMidnight?.defaultBefore?.date === '2026-08-25' &&
    qaResults?.navigation?.calendarMidnight?.defaultAfterBack?.date === '2026-08-26' &&
    qaResults?.navigation?.calendarMidnight?.todayAction?.date === '2026-08-26' &&
    qaResults?.todoMidnight?.before?.group === 'todo-group-upcoming' &&
    qaResults?.todoMidnight?.afterRefresh?.group === 'todo-group-today' &&
    qaResults?.todoMidnight?.afterRefresh?.calendarFrom === '2026-08-26',
  'fake clock KST 자정 뒤 Calendar date 없는 Back·오늘 및 Todo refresh 새 날짜 raw evidence',
)
must(
  qaResults?.todoOverlapRace?.beforeLate?.newestVisible === true &&
    qaResults?.todoOverlapRace?.afterLate?.newestVisible === true &&
    qaResults?.todoOverlapRace?.afterLate?.olderVisible === false,
  'Todo 늦은 이전 refresh 응답이 최신 권위 데이터를 덮지 못하는 raw evidence',
)
must(pkg.scripts?.['session:health'] && pkg.devDependencies?.['@byh3071/vhk'] === '2.14.0', 'master session:health와 VHK 2.14.0 보존')

if (pass) { console.log('✅ goal 23 gate passes'); process.exit(0) }
console.log('❌ goal 23 gate failed'); process.exit(1)
