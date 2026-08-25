#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { parseGoalCompletionTasks } from "../src/lib/goal-tasks.ts"

const APP_URL = process.env.WORK_QA_URL ?? "http://127.0.0.1:3101/"
const CDP_URL = process.env.WORK_QA_CDP ?? "http://127.0.0.1:9225"
const OUTPUT_DIR = "docs/design/control-tower-vnext/work-screen"
const CAPTURE_DIR = join(OUTPUT_DIR, "captures")

const viewports = [360, 432, 768, 1280, 1440]
const surfaces = ["todo", "calendar", "projects"]
const states = ["loading", "error", "empty", "partial", "selected"]
const BEFORE_KST_MIDNIGHT = "2026-08-25T14:59:59.000Z"
const AFTER_KST_MIDNIGHT = "2026-08-25T15:00:01.000Z"

const charts = {
  ingestTrend: [], domainDist: [], categoryDist: [], sourceDist: [], batchHistory: [],
  activity: [], decisionHistory: [], heatmap: [], evaluatorRollup: null,
}

const docsPayload = {
  docs: [],
  stats: { totalDocs: 0, decisions: 0, ingests: 0, batchStatus: "unknown", batchLastRun: null },
  charts,
  changelog: [],
  decisions: [],
  sessions: [],
}

const duplicateGoalText = "동일 Completion Check parser 키를 검증한다"
const duplicateGoalItems = parseGoalCompletionTasks(`
## Completion Check
- [ ] ${duplicateGoalText}
- [ ] ${duplicateGoalText}
`, "yohan-control-tower/goals/qa-duplicate.md", {
  kind: "goal",
  projectName: "yohan-control-tower",
  goalId: 999,
  goalTitle: "QA duplicate parser fixture",
  goalStatus: "NOT_STARTED",
  priority: "P2",
}).items

const todosPayload = {
  ok: true,
  todos: [
    {
      id: "yohan-control-tower/goals/23-work-sibling-views.md#a1b2c3d4",
      text: "작업 URL 복원 계약을 검증한다",
      relPath: "yohan-control-tower/goals/23-work-sibling-views.md",
      line: 31,
      heading: "Completion Check",
      origin: { kind: "goal", projectName: "yohan-control-tower", goalId: 23, goalTitle: "작업 형제 보기", goalStatus: "IN_PROGRESS", priority: "P0" },
    },
    {
      id: "memory/decisions/한글 문서.md#11111111",
      text: "디자인 QA 결과를 확인한다",
      relPath: "memory/decisions/한글 문서.md",
      line: 8,
      heading: "다음 액션",
      origin: { kind: "doc", openPath: "decisions/한글 문서.md" },
    },
    ...duplicateGoalItems,
  ],
  total: 4,
  bySource: { goals: 3, decisions: 1 },
  scanned: ["goals", "memory/decisions"],
  missingDirs: [],
  goalScope: { ok: true, configuredProjects: 1, localProjects: 1 },
  generatedAt: "2026-08-25T09:00:00.000Z",
}

const newestTodosPayload = {
  ...todosPayload,
  todos: todosPayload.todos.map((item, index) => index === 0 ? { ...item, text: "최신 Todo 권위 응답을 유지한다" } : item),
  generatedAt: "2026-08-25T09:00:01.000Z",
}

const calendarOccurrence = {
  id: "task-1@2026-08-25",
  sourceId: "task-1",
  sourceDate: "2026-08-25",
  sourceUpdatedAt: "2026-08-25T09:00:00.000Z",
  kind: "task",
  title: "작업 형제 보기 QA를 마친다",
  date: "2026-08-25",
  startTime: null,
  endTime: null,
  status: "open",
  recurring: false,
  recurrence: "none",
  recurrenceInterval: 1,
  recurrenceUntil: null,
  notes: "Calendar 원장만 완료할 수 있다.",
}

const midnightCalendarOccurrence = {
  ...calendarOccurrence,
  id: "task-midnight@2026-08-26",
  sourceId: "task-midnight",
  sourceDate: "2026-08-26",
  sourceUpdatedAt: "2026-08-25T14:58:00.000Z",
  title: "KST 자정 뒤 오늘로 재분류한다",
  date: "2026-08-26",
  notes: "새로고침 시점의 서울 날짜를 사용한다.",
}

const calendarPayload = {
  ok: true,
  setupRequired: false,
  from: "2026-08-01",
  to: "2026-09-30",
  occurrences: [
    calendarOccurrence,
    { ...calendarOccurrence, id: "event-1@2026-08-25", sourceId: "event-1", kind: "event", title: "주간 검토", startTime: "15:00", endTime: "16:00" },
    midnightCalendarOccurrence,
  ],
  sourceItems: 3,
  issues: [],
  generatedAt: "2026-08-25T09:00:00.000Z",
}

const octoberCalendarOccurrence = {
  ...calendarOccurrence,
  id: "task-2@2026-10-20",
  sourceId: "task-2",
  sourceDate: "2026-10-20",
  sourceUpdatedAt: "2026-10-20T09:00:00.000Z",
  title: "10월 지연 응답 복원을 검증한다",
  date: "2026-10-20",
  notes: "다른 달 item URL은 현재 범위 응답 뒤에만 복원한다.",
}

function calendarPayloadForRequest(url) {
  const parsed = new URL(url)
  const from = parsed.searchParams.get("from") ?? calendarPayload.from
  const to = parsed.searchParams.get("to") ?? calendarPayload.to
  const occurrences = [...calendarPayload.occurrences, octoberCalendarOccurrence]
    .filter((item) => item.date >= from && item.date <= to)
  return { ...calendarPayload, from, to, occurrences, sourceItems: occurrences.length }
}

const taskSummary = { total: 2, active: 1, queued: 0, blocked: 0, done: 1, other: 0, byStatus: { IN_PROGRESS: 1, DONE: 1 } }
const projectFixtures = [
  { name: "yohan-control-tower", mission: "work", status: "active", role: "통합 관제탑", local: true, goalsAvailable: true, tasks: taskSummary },
  { name: "yohan-brain", mission: "work", status: "active", role: "정본 저장소", local: true, goalsAvailable: true, tasks: taskSummary },
]
const projectsPayload = {
  ok: true,
  setupRequired: false,
  missions: [{
    id: "work",
    label: "제품 작업",
    unit: "task",
    projects: projectFixtures,
  }],
  unassignedProjects: 0,
  sourceVersion: "0.3.0",
  generatedAt: "2026-08-25T09:00:00.000Z",
}

const lintPayload = {
  ok: true,
  setupRequired: false,
  counts: { total: 0, actionable: 0, error: 0, warning: 0, info: 0 },
  issues: [],
  excludedLocalDirs: [],
  generatedAt: "2026-08-25T09:00:00.000Z",
}

const projectDetailPayload = {
  ok: true,
  setupRequired: false,
  project: projectFixtures[0],
  goals: [{ file: "goals/23-work-sibling-views.md", type: "goal", id: 23, title: "작업 형제 보기와 안전한 URL 복원", titleDeclared: true, status: "IN_PROGRESS", priority: "P0", completed: null, checks: { total: 9, done: 4 } }],
  available: true,
  generatedAt: "2026-08-25T09:00:00.000Z",
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url)
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true })
      this.socket.addEventListener("error", reject, { once: true })
    })
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result)
        return
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params)
    })
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? []
    listeners.push(listener)
    this.listeners.set(method, listeners)
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    this.socket.close()
  }
}

function response(body, status = 200) {
  return {
    responseCode: status,
    responseHeaders: [
      { name: "Content-Type", value: "application/json; charset=utf-8" },
      { name: "Cache-Control", value: "no-store" },
    ],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  }
}

function emptyPayloadFor(surface, url) {
  if (surface === "todo") {
    if (url.includes("/api/todos")) return { ...todosPayload, todos: [], total: 0 }
    if (url.includes("/api/calendar")) return { ...calendarPayload, occurrences: [], sourceItems: 0 }
  }
  if (surface === "calendar" && url.includes("/api/calendar")) return { ...calendarPayload, occurrences: [], sourceItems: 0 }
  if (surface === "projects" && /\/api\/projects(?:\?|$)/.test(url)) {
    return { ...projectsPayload, missions: [{ ...projectsPayload.missions[0], projects: [] }] }
  }
  return null
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function waitFor(cdp, expression, timeoutMs = 12000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(cdp, expression)) return
    await wait(100)
  }
  throw new Error(`timeout: ${expression}`)
}

async function pressKey(cdp, key, code, windowsVirtualKeyCode, modifiers = 0) {
  const downType = key === "Enter" ? "rawKeyDown" : "keyDown"
  await cdp.send("Input.dispatchKeyEvent", { type: downType, key, code, windowsVirtualKeyCode, modifiers })
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode, modifiers })
}

async function clickAt(cdp, x, y) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 })
}

async function measureFocusTrap(cdp, selector) {
  const setup = await evaluate(cdp, `(() => {
    const dialog = document.querySelector(${JSON.stringify(selector)});
    if (!dialog) return null;
    const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((node) => node.getClientRects().length > 0);
    const label = (node) => (node?.getAttribute('aria-label') || node?.textContent || node?.getAttribute('name') || '').trim().slice(0, 80);
    const first = focusable[0];
    const last = focusable.at(-1);
    const entry = document.activeElement;
    focusable.forEach((node, index) => { node.dataset.qaFocusIndex = String(index); });
    last?.focus();
    return { count: focusable.length, first: label(first), last: label(last), firstIndex: first?.dataset.qaFocusIndex ?? null, lastIndex: last?.dataset.qaFocusIndex ?? null, entry: label(entry), entryContained: Boolean(entry && dialog.contains(entry)) };
  })()`)
  await pressKey(cdp, "Tab", "Tab", 9)
  await wait(50)
  const afterForward = await evaluate(cdp, "(document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || document.activeElement?.getAttribute('name') || '').trim().slice(0,80)")
  const afterForwardIndex = await evaluate(cdp, "document.activeElement?.dataset?.qaFocusIndex ?? null")
  const afterForwardContained = await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)})?.contains(document.activeElement) ?? false`)
  await evaluate(cdp, `(() => { const dialog = document.querySelector(${JSON.stringify(selector)}); const first = dialog?.querySelector('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'); first?.focus(); return true })()`)
  await pressKey(cdp, "Tab", "Tab", 9, 8)
  await wait(50)
  const afterBackward = await evaluate(cdp, "(document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || document.activeElement?.getAttribute('name') || '').trim().slice(0,80)")
  const afterBackwardIndex = await evaluate(cdp, "document.activeElement?.dataset?.qaFocusIndex ?? null")
  const afterBackwardContained = await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)})?.contains(document.activeElement) ?? false`)
  return { ...setup, afterForward, afterForwardIndex, afterForwardContained, afterBackward, afterBackwardIndex, afterBackwardContained }
}

function scenarioHref(surface, state) {
  const params = new URLSearchParams({ view: "work", surface })
  if (surface === "calendar") {
    params.set("date", "2026-08-25")
    params.set("mode", "month")
    if (state === "selected") params.set("item", `calendar:${calendarOccurrence.id}`)
  }
  if (surface === "projects") {
    params.set("mission", "work")
    if (state === "selected") params.set("project", "yohan-control-tower")
  }
  return `${APP_URL}?${params}`
}

function metricExpression() {
  return `(() => {
    const shell = document.querySelector('.work-shell');
    if (!shell) return null;
    const portalDialogs = [...document.querySelectorAll('[data-work-calendar-dialog]')];
    const controls = [shell, ...portalDialogs].flatMap((root) => [...root.querySelectorAll('button,[role="button"],input,select,textarea')]).filter((node) => node.getClientRects().length > 0);
    const targetMeasurements = controls.map((node) => {
      const rect = node.getBoundingClientRect();
      return { scope: node.closest('[data-work-calendar-dialog]') ? 'calendar-portal' : 'work-shell', label: (node.getAttribute('aria-label') || node.textContent || node.getAttribute('name') || '').trim().slice(0, 60), width: rect.width, height: rect.height };
    });
    const shortTargets = targetMeasurements.filter((item) => item.width < 44 || item.height < 44);
    const paragraphs = [...shell.querySelectorAll('p')].map((node) => Number.parseFloat(getComputedStyle(node).fontSize));
    const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
    const modalScrollable = Boolean(modal && modal.scrollHeight > modal.clientHeight + 1);
    const pageScrollable = document.documentElement.scrollHeight > document.documentElement.clientHeight + 1;
    const pageScrollLocked = [getComputedStyle(document.documentElement).overflow, getComputedStyle(document.body).overflow].some((value) => value === 'hidden');
    const portalControls = controls.filter((node) => node.closest('[data-work-calendar-dialog]'));
    return {
      url: location.pathname + location.search,
      title: shell.querySelector('h1')?.textContent?.trim() || '',
      h1Count: shell.querySelectorAll('h1').length,
      currentSurface: shell.querySelector('nav [aria-current="page"]')?.textContent?.trim() || '',
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      doubleScroll: Boolean(modalScrollable && pageScrollable && !pageScrollLocked),
      shortTargets,
      portalControlTargets: {
        total: portalControls.length,
        measurements: targetMeasurements.filter((item) => item.scope === 'calendar-portal'),
        failures: shortTargets.filter((item) => item.scope === 'calendar-portal'),
      },
      modal: modal ? { role: modal.getAttribute('role'), ariaModal: modal.getAttribute('aria-modal'), bodyOverflow: getComputedStyle(document.body).overflow } : null,
      minimumParagraphPx: paragraphs.length ? Math.min(...paragraphs) : null,
      selectedCount: shell.querySelectorAll('[aria-selected="true"], [aria-current="page"]').length,
      bodyFontPx: Number.parseFloat(getComputedStyle(shell).fontSize),
      text: shell.innerText.slice(0, 1200),
    };
  })()`
}

async function main() {
  await mkdir(CAPTURE_DIR, { recursive: true })
  const target = await fetch(`${CDP_URL}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((result) => result.json())
  const cdp = new Cdp(target.webSocketDebuggerUrl)
  await cdp.open()

  let scenario = { surface: "todo", state: "success" }
  const paused = new Set()
  const delayedCalendarRequests = []
  const delayedTodoRequests = []
  let todoOverlapRequestCount = 0
  const consoleErrors = []
  cdp.on("Runtime.consoleAPICalled", (event) => {
    if (event.type === "error") consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description ?? "error").join(" "))
  })
  cdp.on("Runtime.exceptionThrown", (event) => consoleErrors.push(event.exceptionDetails?.text ?? "runtime exception"))
  cdp.on("Fetch.requestPaused", async ({ requestId, request }) => {
    try {
      const url = request.url
      if (!url.includes("/api/")) {
        await cdp.send("Fetch.continueRequest", { requestId })
        return
      }
      if (url.includes("/api/docs")) {
        await cdp.send("Fetch.fulfillRequest", { requestId, ...response(docsPayload) })
        return
      }
      const relevant = url.includes("/api/todos") || url.includes("/api/calendar") || url.includes("/api/projects") || url.includes("/api/lint")
      if (!relevant) {
        await cdp.send("Fetch.continueRequest", { requestId })
        return
      }

      if (scenario.state === "todo-source-error" && url.includes("/api/todos")) {
        await cdp.send("Fetch.fulfillRequest", { requestId, ...response({ ok: false, error: "QA authoritative source failure" }, 500) })
        return
      }
      if (scenario.state === "todo-overlap" && request.method === "GET" && url.includes("/api/todos")) {
        todoOverlapRequestCount += 1
        if (todoOverlapRequestCount === 1) {
          paused.add(requestId)
          delayedTodoRequests.push({ requestId, url })
          return
        }
        await cdp.send("Fetch.fulfillRequest", { requestId, ...response(newestTodosPayload) })
        return
      }
      if (scenario.state === "detail-error" && /\/api\/projects\/[^/?]+/.test(url)) {
        await cdp.send("Fetch.fulfillRequest", { requestId, ...response({ ok: false, error: "QA detail failure" }, 500) })
        return
      }
      if (scenario.state === "calendar-cross-month" && request.method === "GET" && url.includes("/api/calendar") && new URL(url).searchParams.get("from")?.startsWith("2026-09")) {
        paused.add(requestId)
        delayedCalendarRequests.push({ requestId, url })
        return
      }

      const loadingOwner = scenario.surface === "todo"
        ? url.includes("/api/todos") || url.includes("/api/calendar")
        : scenario.surface === "calendar"
          ? scenario.state !== "partial" && url.includes("/api/calendar")
          : url.includes("/api/projects")
      if (scenario.state === "loading" && loadingOwner) {
        paused.add(requestId)
        return
      }

      const errorOwner = scenario.surface === "todo"
        ? (scenario.state === "partial" ? url.includes("/api/calendar") : url.includes("/api/todos") || url.includes("/api/calendar"))
        : scenario.surface === "calendar"
          ? url.includes("/api/calendar")
          : scenario.state === "partial" ? url.includes("/api/lint") : url.includes("/api/projects")
      if ((scenario.state === "error" || scenario.state === "partial") && errorOwner) {
        await cdp.send("Fetch.fulfillRequest", { requestId, ...response({ ok: false, error: "QA fixture source failure" }, 500) })
        return
      }

      if (scenario.state === "empty") {
        const empty = emptyPayloadFor(scenario.surface, url)
        if (empty) {
          await cdp.send("Fetch.fulfillRequest", { requestId, ...response(empty) })
          return
        }
      }

      if (scenario.surface === "calendar" && scenario.state === "partial" && url.includes("/api/calendar")) {
        await cdp.send("Fetch.fulfillRequest", { requestId, ...response({ ...calendarPayload, issues: [{ file: "partial.md", message: "읽기 실패" }] }) })
        return
      }
      if (url.includes("/api/todos")) await cdp.send("Fetch.fulfillRequest", { requestId, ...response(todosPayload) })
      else if (url.includes("/api/calendar")) await cdp.send("Fetch.fulfillRequest", { requestId, ...response(calendarPayloadForRequest(url)) })
      else if (/\/api\/projects\/[^/?]+/.test(url)) {
        const slug = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "")
        const project = projectFixtures.find((item) => item.name === slug) ?? projectFixtures[0]
        await cdp.send("Fetch.fulfillRequest", { requestId, ...response({ ...projectDetailPayload, project }) })
      }
      else if (url.includes("/api/projects")) await cdp.send("Fetch.fulfillRequest", { requestId, ...response(projectsPayload) })
      else if (url.includes("/api/lint")) await cdp.send("Fetch.fulfillRequest", { requestId, ...response(lintPayload) })
      else await cdp.send("Fetch.continueRequest", { requestId })
    } catch (error) {
      consoleErrors.push(`fixture handler: ${error instanceof Error ? error.message : String(error)}`)
    }
  })

  await cdp.send("Page.enable")
  await cdp.send("Runtime.enable")
  await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] })
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
    const NativeDate = Date;
    let clock = NativeDate.parse(${JSON.stringify(BEFORE_KST_MIDNIGHT)});
    class FakeDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [clock])); }
      static now() { return clock; }
    }
    globalThis.Date = FakeDate;
    globalThis.__setWorkQaClock = (value) => { clock = NativeDate.parse(value); };
  })()` })
  const browserVersion = await cdp.send("Browser.getVersion")

  const readings = []
  const run = async (surface, state, width, capture = true) => {
    for (const requestId of paused) {
      await cdp.send("Fetch.failRequest", { requestId, errorReason: "Aborted" }).catch(() => {})
      paused.delete(requestId)
    }
    scenario = { surface, state }
    const beforeErrors = consoleErrors.length
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await cdp.send("Page.navigate", { url: scenarioHref(surface, state) })
    await waitFor(cdp, "Boolean(document.querySelector('.work-shell h1'))")
    await wait(state === "loading" ? 450 : 1100)

    if (state === "selected" && surface === "todo") {
      await evaluate(cdp, "document.querySelector('.work-shell [role=option]')?.click(); true")
      await waitFor(cdp, "Boolean(document.querySelector('aside[aria-labelledby=\"todo-detail-heading\"]'))")
    }
    const reading = await evaluate(cdp, metricExpression())
    reading.surface = surface
    reading.state = state
    reading.viewport = width
    reading.consoleErrors = consoleErrors.slice(beforeErrors)
    readings.push(reading)
    if (capture) {
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
      await writeFile(join(CAPTURE_DIR, `${surface}-${state}-${width}.png`), Buffer.from(screenshot.data, "base64"))
    }
  }

  for (const width of viewports) {
    for (const surface of surfaces) await run(surface, "success", width)
  }
  for (const surface of surfaces) {
    for (const state of states) await run(surface, state, 1280)
  }
  for (const width of [360, 768]) {
    for (const surface of surfaces) await run(surface, "selected", width)
  }

  scenario = { surface: "todo", state: "success" }
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await cdp.send("Page.navigate", { url: scenarioHref("todo", "success") })
  await waitFor(cdp, "Boolean(document.querySelector('.work-shell nav button'))")
  await wait(900)
  const todoSearch = new URL(scenarioHref("todo", "success")).search
  const calendarSearch = "?view=work&surface=calendar"
  await evaluate(cdp, `history.replaceState(null, '', ${JSON.stringify(todoSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  await waitFor(cdp, `location.search === ${JSON.stringify(todoSearch)}`)
  await evaluate(cdp, "document.querySelector('.work-shell nav button')?.focus(); true")
  await pressKey(cdp, "ArrowRight", "ArrowRight", 39)
  const siblingFocus = await evaluate(cdp, "document.activeElement?.textContent?.trim() || ''")
  await pressKey(cdp, "Enter", "Enter", 13)
  await waitFor(cdp, `location.search === ${JSON.stringify(calendarSearch)}`)
  const afterEnter = await evaluate(cdp, "location.search")
  await evaluate(cdp, "history.back(); true")
  await waitFor(cdp, `location.search === ${JSON.stringify(todoSearch)}`)
  const afterBack = await evaluate(cdp, "location.search")
  await evaluate(cdp, "history.forward(); true")
  await waitFor(cdp, `location.search === ${JSON.stringify(calendarSearch)}`)
  const afterForward = await evaluate(cdp, "location.search")

  scenario = { surface: "calendar", state: "success" }
  const calendarDefaultSearch = "?view=work&surface=calendar"
  const calendarBothSearch = `?${new URLSearchParams({ view: "work", surface: "calendar", date: "2026-10-20", mode: "list" })}`
  const calendarDateOnlySearch = `?${new URLSearchParams({ view: "work", surface: "calendar", date: "2026-10-20" })}`
  const calendarModeOnlySearch = `?${new URLSearchParams({ view: "work", surface: "calendar", mode: "list" })}`
  const browserToday = await evaluate(cdp, "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())")
  const calendarStateExpression = "(() => { const node = document.querySelector('[data-calendar-date][data-calendar-mode]'); return node ? { search: location.search, date: node.getAttribute('data-calendar-date'), mode: node.getAttribute('data-calendar-mode') } : null })()"
  const waitCalendarState = async (search, date, mode) => {
    await waitFor(cdp, `location.search === ${JSON.stringify(search)}`)
    await waitFor(cdp, `document.querySelector('[data-calendar-date]')?.getAttribute('data-calendar-date') === ${JSON.stringify(date)} && document.querySelector('[data-calendar-mode]')?.getAttribute('data-calendar-mode') === ${JSON.stringify(mode)}`)
    return evaluate(cdp, calendarStateExpression)
  }
  await evaluate(cdp, `history.replaceState(null, '', ${JSON.stringify(calendarDefaultSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  const optionalDefault = await waitCalendarState(calendarDefaultSearch, browserToday, "month")
  await evaluate(cdp, `history.pushState(null, '', ${JSON.stringify(calendarBothSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  const bothBeforeRemoval = await waitCalendarState(calendarBothSearch, "2026-10-20", "list")
  await evaluate(cdp, "history.back(); true")
  const bothAfterBack = await waitCalendarState(calendarDefaultSearch, browserToday, "month")
  await evaluate(cdp, "history.forward(); true")
  const bothAfterForward = await waitCalendarState(calendarBothSearch, "2026-10-20", "list")

  await evaluate(cdp, `history.replaceState(null, '', ${JSON.stringify(calendarDateOnlySearch)}); window.dispatchEvent(new PopStateEvent('popstate')); history.pushState(null, '', ${JSON.stringify(calendarBothSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  await waitCalendarState(calendarBothSearch, "2026-10-20", "list")
  await evaluate(cdp, "history.back(); true")
  const modeAfterBackRemoval = await waitCalendarState(calendarDateOnlySearch, "2026-10-20", "month")
  await evaluate(cdp, "history.forward(); true")
  const modeAfterForwardRestore = await waitCalendarState(calendarBothSearch, "2026-10-20", "list")

  await evaluate(cdp, `history.replaceState(null, '', ${JSON.stringify(calendarModeOnlySearch)}); window.dispatchEvent(new PopStateEvent('popstate')); history.pushState(null, '', ${JSON.stringify(calendarBothSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  await waitCalendarState(calendarBothSearch, "2026-10-20", "list")
  await evaluate(cdp, "history.back(); true")
  const dateAfterBackRemoval = await waitCalendarState(calendarModeOnlySearch, browserToday, "list")
  await evaluate(cdp, "history.forward(); true")
  const dateAfterForwardRestore = await waitCalendarState(calendarBothSearch, "2026-10-20", "list")
  const calendarOptionalState = {
    browserToday,
    default: optionalDefault,
    bothFieldRemoval: { before: bothBeforeRemoval, afterBack: bothAfterBack, afterForward: bothAfterForward },
    modeFieldRemoval: { afterBack: modeAfterBackRemoval, afterForward: modeAfterForwardRestore },
    dateFieldRemoval: { afterBack: dateAfterBackRemoval, afterForward: dateAfterForwardRestore },
  }

  await evaluate(cdp, `globalThis.__setWorkQaClock(${JSON.stringify(BEFORE_KST_MIDNIGHT)}); history.replaceState(null, '', ${JSON.stringify(calendarDefaultSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  const midnightDefaultBefore = await waitCalendarState(calendarDefaultSearch, "2026-08-25", "month")
  await evaluate(cdp, `history.pushState(null, '', ${JSON.stringify(calendarBothSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  await waitCalendarState(calendarBothSearch, "2026-10-20", "list")
  await evaluate(cdp, `globalThis.__setWorkQaClock(${JSON.stringify(AFTER_KST_MIDNIGHT)}); history.back(); true`)
  const midnightDefaultAfterBack = await waitCalendarState(calendarDefaultSearch, "2026-08-26", "month")
  await evaluate(cdp, `history.pushState(null, '', ${JSON.stringify(calendarDateOnlySearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  await waitCalendarState(calendarDateOnlySearch, "2026-10-20", "month")
  await evaluate(cdp, `([...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === '오늘'))?.click(); true`)
  const calendarTodaySearch = `?${new URLSearchParams({ view: "work", surface: "calendar", date: "2026-08-26", mode: "month" })}`
  const midnightTodayAction = await waitCalendarState(calendarTodaySearch, "2026-08-26", "month")
  const calendarMidnight = {
    beforeClock: BEFORE_KST_MIDNIGHT,
    afterClock: AFTER_KST_MIDNIGHT,
    defaultBefore: midnightDefaultBefore,
    defaultAfterBack: midnightDefaultAfterBack,
    todayAction: midnightTodayAction,
  }
  await evaluate(cdp, "history.replaceState(null, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); true")
  await waitFor(cdp, "location.search === '' && Boolean(document.querySelector('h1'))")
  const noQueryParent = await evaluate(cdp, "({ search: location.search, h1: document.querySelector('h1')?.textContent?.trim() || '', activeTopTab: document.querySelector('[aria-current=page]')?.textContent?.trim() || '', workShellPresent: Boolean(document.querySelector('.work-shell')) })")

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 900, deviceScaleFactor: 1, mobile: true })
  scenario = { surface: "todo", state: "success" }
  await evaluate(cdp, `history.replaceState(null, '', ${JSON.stringify(todoSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  await waitFor(cdp, "document.querySelectorAll('.work-shell [role=option]').length >= 2")
  await wait(400)
  const todoFirstText = await evaluate(cdp, "(() => { const row = document.querySelector('.work-shell [role=option]'); row?.focus(); return row?.textContent?.trim().slice(0,120) || '' })()")
  await pressKey(cdp, "ArrowDown", "ArrowDown", 40)
  const todoAfterArrowDown = await evaluate(cdp, "document.activeElement?.textContent?.trim().slice(0,120) || ''")
  await pressKey(cdp, "Enter", "Enter", 13)
  const todoDialogSelector = 'aside[role="dialog"][aria-labelledby="todo-detail-heading"]'
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(todoDialogSelector)}))`)
  await waitFor(cdp, `document.querySelector(${JSON.stringify(todoDialogSelector)})?.contains(document.activeElement)`)
  const todoSelectedItem = await evaluate(cdp, "new URLSearchParams(location.search).get('item')")
  const todoFocusTrap = await measureFocusTrap(cdp, todoDialogSelector)
  await pressKey(cdp, "Escape", "Escape", 27)
  await waitFor(cdp, "!document.querySelector('aside[aria-labelledby=\"todo-detail-heading\"]')")
  await waitFor(cdp, `(document.activeElement?.textContent?.trim().slice(0,120) || '') === ${JSON.stringify(todoAfterArrowDown)}`)
  const todoAfterEscape = await evaluate(cdp, "({ detailOpen: Boolean(document.querySelector('aside[aria-labelledby=\"todo-detail-heading\"]')), activeText: document.activeElement?.textContent?.trim().slice(0,120) || '' })")

  scenario = { surface: "projects", state: "success" }
  const projectsSearch = new URL(scenarioHref("projects", "success")).search
  await evaluate(cdp, `history.replaceState(null, '', ${JSON.stringify(projectsSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  await waitFor(cdp, "document.querySelectorAll('[aria-label=\"프로젝트 목록\"] [role=option]').length >= 2")
  await wait(400)
  const projectFirstText = await evaluate(cdp, "(() => { const row = document.querySelector('[aria-label=\"프로젝트 목록\"] [role=option]'); row?.focus(); return row?.textContent?.trim().slice(0,120) || '' })()")
  await pressKey(cdp, "ArrowDown", "ArrowDown", 40)
  const projectAfterArrowDown = await evaluate(cdp, "document.activeElement?.textContent?.trim().slice(0,120) || ''")
  await pressKey(cdp, "Enter", "Enter", 13)
  const projectDialogSelector = 'aside[role="dialog"][aria-labelledby="project-detail-heading"]'
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(projectDialogSelector)}))`)
  await waitFor(cdp, `document.querySelector(${JSON.stringify(projectDialogSelector)})?.contains(document.activeElement)`)
  const projectSelectedItem = await evaluate(cdp, "new URLSearchParams(location.search).get('project')")
  const projectFocusTrap = await measureFocusTrap(cdp, projectDialogSelector)
  await pressKey(cdp, "Escape", "Escape", 27)
  await waitFor(cdp, "!document.querySelector('aside[aria-labelledby=\"project-detail-heading\"]')")
  await waitFor(cdp, `(document.activeElement?.textContent?.trim().slice(0,120) || '') === ${JSON.stringify(projectAfterArrowDown)}`)
  const projectAfterEscape = await evaluate(cdp, "({ detailOpen: Boolean(document.querySelector('aside[aria-labelledby=\"project-detail-heading\"]')), activeText: document.activeElement?.textContent?.trim().slice(0,120) || '' })")

  const verifySheetAtWidth = async (surface, width) => {
    scenario = { surface, state: "success" }
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await cdp.send("Page.navigate", { url: scenarioHref(surface, "success") })
    const rowSelector = surface === "todo" ? ".work-shell [role=option]" : '[aria-label="프로젝트 목록"] [role=option]'
    const rowIndex = 1
    await waitFor(cdp, `document.querySelectorAll(${JSON.stringify(rowSelector)}).length > ${rowIndex}`)
    const origin = await evaluate(cdp, `(() => {
      const row = document.querySelectorAll(${JSON.stringify(rowSelector)})[${rowIndex}];
      row.dataset.qaBackdropOrigin = ${JSON.stringify(surface)};
      row.focus();
      row.click();
      return { text: row.textContent?.trim().slice(0, 120) || '', key: row.getAttribute('data-work-item-key') || row.textContent?.trim().slice(0, 120) || '' };
    })()`)
    const dialogSelector = surface === "todo"
      ? 'aside[role="dialog"][aria-labelledby="todo-detail-heading"]'
      : 'aside[role="dialog"][aria-labelledby="project-detail-heading"]'
    await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(dialogSelector)}))`)
    await waitFor(cdp, `document.querySelector(${JSON.stringify(dialogSelector)})?.contains(document.activeElement)`)
    const focusTrap = await measureFocusTrap(cdp, dialogSelector)
    const geometry = await evaluate(cdp, `(() => {
      const sheet = document.querySelector(${JSON.stringify(`[data-work-detail-sheet="${surface}"]`)}).getBoundingClientRect();
      const backdrop = document.querySelector(${JSON.stringify(`[data-work-dialog-backdrop="${surface}"]`)}).getBoundingClientRect();
      const row = document.querySelector(${JSON.stringify(`[data-qa-backdrop-origin="${surface}"]`)});
      const rowRect = row.getBoundingClientRect();
      window.__workQaBackgroundClicks = 0;
      row.addEventListener('click', () => { window.__workQaBackgroundClicks += 1; });
      document.addEventListener('click', (event) => { window.__workQaLastClickTarget = event.target?.getAttribute?.('data-work-dialog-backdrop') || ''; }, { capture: true });
      return {
        sheet: { x: sheet.x, y: sheet.y, width: sheet.width, height: sheet.height },
        backdrop: { x: backdrop.x, y: backdrop.y, width: backdrop.width, height: backdrop.height },
        clickPoint: { x: Math.min(300, rowRect.left + 80), y: rowRect.top + rowRect.height / 2 },
        viewport: { width: innerWidth, height: innerHeight },
      };
    })()`)
    let pointerProbe
    if (width < 768) {
      await clickAt(cdp, 4, 4)
      await wait(100)
      pointerProbe = await evaluate(cdp, `({
        backgroundClicks: window.__workQaBackgroundClicks,
        dialogOpen: Boolean(document.querySelector(${JSON.stringify(dialogSelector)})),
        targetInsideSheet: document.querySelector(${JSON.stringify(dialogSelector)})?.contains(document.elementFromPoint(4, 4)) ?? false,
      })`)
      await evaluate(cdp, `document.querySelector(${JSON.stringify(`[data-work-dialog-backdrop="${surface}"]`)})?.click(); true`)
    } else {
      pointerProbe = await evaluate(cdp, `({
        backgroundClicks: window.__workQaBackgroundClicks,
        dialogOpen: Boolean(document.querySelector(${JSON.stringify(dialogSelector)})),
        targetIsBackdrop: document.elementFromPoint(${geometry.clickPoint.x}, ${geometry.clickPoint.y})?.getAttribute('data-work-dialog-backdrop') === ${JSON.stringify(surface)},
      })`)
      await clickAt(cdp, geometry.clickPoint.x, geometry.clickPoint.y)
    }
    await waitFor(cdp, `!document.querySelector(${JSON.stringify(dialogSelector)})`)
    await waitFor(cdp, `document.activeElement?.dataset?.qaBackdropOrigin === ${JSON.stringify(surface)}`)
    const afterBackdrop = await evaluate(cdp, `({
      backgroundClicks: window.__workQaBackgroundClicks,
      lastClickTarget: window.__workQaLastClickTarget,
      focusReturned: document.activeElement?.dataset?.qaBackdropOrigin === ${JSON.stringify(surface)},
      dialogOpen: Boolean(document.querySelector(${JSON.stringify(dialogSelector)})),
    })`)
    return { origin, focusTrap, geometry, pointerProbe, afterBackdrop }
  }

  const sheet360 = {
    todo: await verifySheetAtWidth("todo", 360),
    projects: await verifySheetAtWidth("projects", 360),
  }
  const sheet768 = {
    todo: await verifySheetAtWidth("todo", 768),
    projects: await verifySheetAtWidth("projects", 768),
  }

  const productionGoalKey = "goal:yohan-control-tower/goals/23-work-sibling-views.md#a1b2c3d4"
  const productionGoalSearch = `?${new URLSearchParams({ view: "work", surface: "todo", item: productionGoalKey })}`
  scenario = { surface: "todo", state: "success" }
  await cdp.send("Page.navigate", { url: `${APP_URL}${productionGoalSearch}` })
  await waitFor(cdp, "Boolean(document.querySelector('#todo-detail-heading')?.textContent?.trim())")
  const refreshBefore = await evaluate(cdp, "({ search: location.search, item: new URLSearchParams(location.search).get('item'), heading: document.querySelector('#todo-detail-heading')?.textContent?.trim() || '' })")
  await cdp.send("Page.reload", { ignoreCache: true })
  await wait(500)
  await waitFor(cdp, "Boolean(document.querySelector('#todo-detail-heading')?.textContent?.trim())")
  const refreshAfter = await evaluate(cdp, "({ search: location.search, item: new URLSearchParams(location.search).get('item'), heading: document.querySelector('#todo-detail-heading')?.textContent?.trim() || '' })")

  scenario = { surface: "todo", state: "todo-midnight" }
  await cdp.send("Page.navigate", { url: scenarioHref("todo", "success") })
  const midnightTodoGroupExpression = `(() => {
    const row = [...document.querySelectorAll('[data-work-item-key]')].find((node) => node.textContent?.includes(${JSON.stringify(midnightCalendarOccurrence.title)}));
    return row?.closest('section')?.querySelector('h3')?.id ?? null;
  })()`
  await waitFor(cdp, `${midnightTodoGroupExpression} === 'todo-group-upcoming'`)
  const todoMidnightBefore = await evaluate(cdp, `({ clock: new Date().toISOString(), group: ${midnightTodoGroupExpression}, dateLabel: document.querySelector('aside[aria-label="오늘 일정"] h2 + p')?.textContent?.trim() || '' })`)
  await evaluate(cdp, `globalThis.__setWorkQaClock(${JSON.stringify(AFTER_KST_MIDNIGHT)}); ([...document.querySelectorAll('button')].find((button) => button.textContent?.includes('새로고침')))?.click(); true`)
  await waitFor(cdp, `${midnightTodoGroupExpression} === 'todo-group-today'`)
  await waitFor(cdp, "document.querySelector('aside[aria-label=\"오늘 일정\"] h2 + p')?.textContent?.includes('2026-08-26')")
  const todoMidnightAfter = await evaluate(cdp, `({
    clock: new Date().toISOString(),
    group: ${midnightTodoGroupExpression},
    dateLabel: document.querySelector('aside[aria-label="오늘 일정"] h2 + p')?.textContent?.trim() || '',
    calendarFrom: [...performance.getEntriesByType('resource')].map((entry) => entry.name).filter((name) => name.includes('/api/calendar?')).map((name) => new URL(name).searchParams.get('from')).at(-1) ?? null,
  })`)
  const todoMidnight = { before: todoMidnightBefore, afterRefresh: todoMidnightAfter }

  const unicodeItemKey = "doc:memory/decisions/한글 문서.md#11111111"
  const unicodeItemSearch = `?${new URLSearchParams({ view: "work", surface: "todo", item: unicodeItemKey })}`
  await cdp.send("Page.navigate", { url: `${APP_URL}${unicodeItemSearch}` })
  await waitFor(cdp, "Boolean(document.querySelector('#todo-detail-heading')?.textContent?.trim())")
  const keyEvidence = await evaluate(cdp, `(() => {
    const duplicateRows = [...document.querySelectorAll('[data-work-item-key]')]
      .filter((node) => node.textContent?.includes(${JSON.stringify(duplicateGoalText)}))
      .map((node) => ({ key: node.getAttribute('data-work-item-key'), text: node.textContent?.trim().slice(0, 120) || '' }));
    return {
      requestedUnicodeItem: ${JSON.stringify(unicodeItemKey)},
      parsedUnicodeItem: new URLSearchParams(location.search).get('item'),
      encodedSearch: location.search,
      detailHeading: document.querySelector('#todo-detail-heading')?.textContent?.trim() || '',
      duplicateRows,
      distinctDuplicateKeys: new Set(duplicateRows.map((row) => row.key)).size,
      parserProduced: ${JSON.stringify(duplicateGoalItems.map((item) => ({ id: item.id, line: item.line, text: item.text, renderedKey: `${item.origin.kind}:${item.id}` })))},
    };
  })()`)

  scenario = { surface: "todo", state: "todo-source-error" }
  await cdp.send("Page.navigate", { url: `${APP_URL}${productionGoalSearch}` })
  await waitFor(cdp, "document.body.innerText.includes('QA authoritative source failure')")
  const sourceFailure = await evaluate(cdp, "({ search: location.search, item: new URLSearchParams(location.search).get('item'), detailOpen: Boolean(document.querySelector('#todo-detail-heading')) })")

  scenario = { surface: "projects", state: "detail-error" }
  const selectedProjectSearch = new URL(scenarioHref("projects", "selected")).search
  await cdp.send("Page.navigate", { url: `${APP_URL}${selectedProjectSearch}` })
  await waitFor(cdp, "document.body.innerText.includes('QA detail failure')")
  const detailFailure = await evaluate(cdp, "({ search: location.search, project: new URLSearchParams(location.search).get('project'), listItems: document.querySelectorAll('[aria-label=\"프로젝트 목록\"] [role=option]').length, errorVisible: document.body.innerText.includes('QA detail failure') })")

  scenario = { surface: "todo", state: "todo-overlap" }
  todoOverlapRequestCount = 0
  delayedTodoRequests.length = 0
  await cdp.send("Page.navigate", { url: scenarioHref("todo", "success") })
  await waitFor(cdp, "document.body.innerText.includes('Calendar')")
  await waitFor(cdp, "window.performance.getEntriesByType('resource').length >= 0")
  const todoDelayStarted = Date.now()
  while (delayedTodoRequests.length < 1 && Date.now() - todoDelayStarted < 12000) await wait(100)
  if (delayedTodoRequests.length < 1) throw new Error("timeout: first Todo refresh request was not delayed")
  await evaluate(cdp, `([...document.querySelectorAll('button')].find((button) => button.textContent?.includes('새로고침')))?.click(); true`)
  await waitFor(cdp, "document.body.innerText.includes('최신 Todo 권위 응답을 유지한다')")
  const todoOverlapBeforeLate = await evaluate(cdp, "({ newestVisible: document.body.innerText.includes('최신 Todo 권위 응답을 유지한다'), olderVisible: document.body.innerText.includes('작업 URL 복원 계약을 검증한다') })")
  const delayedTodo = delayedTodoRequests.shift()
  paused.delete(delayedTodo.requestId)
  let todoLateRelease = "fulfilled"
  try {
    await cdp.send("Fetch.fulfillRequest", { requestId: delayedTodo.requestId, ...response(todosPayload) })
  } catch {
    todoLateRelease = "canceled"
  }
  await wait(500)
  const todoOverlapAfterLate = await evaluate(cdp, "({ newestVisible: document.body.innerText.includes('최신 Todo 권위 응답을 유지한다'), olderVisible: document.body.innerText.includes('작업 URL 복원 계약을 검증한다') })")
  const todoOverlapRace = { beforeLate: todoOverlapBeforeLate, lateRelease: todoLateRelease, afterLate: todoOverlapAfterLate }

  const verifyStaleHistory = async ({ staleSearch, canonicalSearch, backSearch }) => {
    scenario = { surface: "todo", state: "success" }
    await evaluate(cdp, `history.replaceState(null, '', ${JSON.stringify(backSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
    await waitFor(cdp, `location.search === ${JSON.stringify(backSearch)}`)
    await evaluate(cdp, `history.pushState(null, '', ${JSON.stringify(staleSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
    await waitFor(cdp, `location.search === ${JSON.stringify(canonicalSearch)}`)
    const canonicalized = await evaluate(cdp, "location.search")
    await evaluate(cdp, "history.back(); true")
    await waitFor(cdp, `location.search === ${JSON.stringify(backSearch)}`)
    return { staleSearch, canonicalized, afterBack: await evaluate(cdp, "location.search") }
  }
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  const staleHistory = {
    todo: await verifyStaleHistory({
      staleSearch: `?${new URLSearchParams({ view: "work", surface: "todo", item: "goal:yohan-control-tower/goals/missing.md#deadbeef" })}`,
      canonicalSearch: todoSearch,
      backSearch: calendarSearch,
    }),
    projects: await verifyStaleHistory({
      staleSearch: `?${new URLSearchParams({ view: "work", surface: "projects", mission: "work", project: "missing-project" })}`,
      canonicalSearch: projectsSearch,
      backSearch: todoSearch,
    }),
    calendar: await verifyStaleHistory({
      staleSearch: `?${new URLSearchParams({ view: "work", surface: "calendar", date: "2026-08-25", mode: "month", item: "calendar:missing@2026-08-25" })}`,
      canonicalSearch: `?${new URLSearchParams({ view: "work", surface: "calendar", date: "2026-08-25", mode: "month" })}`,
      backSearch: todoSearch,
    }),
  }

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 900, deviceScaleFactor: 1, mobile: true })
  scenario = { surface: "calendar", state: "success" }
  const calendarBaseSearch = `?${new URLSearchParams({ view: "work", surface: "calendar", date: "2026-08-25", mode: "month" })}`
  const calendarDialogSelector = '[data-work-calendar-dialog][role="dialog"]'
  const augustEditSelector = `[data-calendar-edit-id="${calendarOccurrence.id}"]`
  await cdp.send("Page.navigate", { url: `${APP_URL}${calendarBaseSearch}` })
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(augustEditSelector)}))`)
  await evaluate(cdp, `(() => { const trigger = document.querySelector(${JSON.stringify(augustEditSelector)}); trigger.focus(); trigger.click(); return true })()`)
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)}))`)
  await waitFor(cdp, `document.querySelector(${JSON.stringify(calendarDialogSelector)})?.contains(document.activeElement)`)
  const validSelectionOpen = await evaluate(cdp, `({ search: location.search, item: new URLSearchParams(location.search).get('item'), dialogOpen: Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)})) })`)
  await evaluate(cdp, "history.back(); true")
  await waitFor(cdp, `location.search === ${JSON.stringify(calendarBaseSearch)}`)
  await waitFor(cdp, `!document.querySelector(${JSON.stringify(calendarDialogSelector)})`)
  await waitFor(cdp, `document.activeElement?.getAttribute('data-calendar-edit-id') === ${JSON.stringify(calendarOccurrence.id)}`)
  const validSelectionBackClose = await evaluate(cdp, `({
    search: location.search,
    item: new URLSearchParams(location.search).get('item'),
    dialogOpen: Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)})),
    activeEditId: document.activeElement?.getAttribute('data-calendar-edit-id'),
  })`)

  await evaluate(cdp, `document.querySelector(${JSON.stringify(augustEditSelector)})?.click(); true`)
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)}))`)
  await evaluate(cdp, `([...document.querySelectorAll(${JSON.stringify(`${calendarDialogSelector} button`)})].find((button) => button.textContent?.trim() === '취소'))?.click(); true`)
  await waitFor(cdp, `!document.querySelector(${JSON.stringify(calendarDialogSelector)})`)
  await waitFor(cdp, `document.activeElement?.getAttribute('data-calendar-edit-id') === ${JSON.stringify(calendarOccurrence.id)}`)
  const userCloseFocus = await evaluate(cdp, `({
    dialogOpen: Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)})),
    activeEditId: document.activeElement?.getAttribute('data-calendar-edit-id'),
    fallbackFocused: document.activeElement?.hasAttribute('data-calendar-focus-fallback') ?? false,
  })`)

  await evaluate(cdp, `document.querySelector(${JSON.stringify(augustEditSelector)})?.click(); true`)
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)}))`)
  await waitFor(cdp, `document.querySelector(${JSON.stringify(calendarDialogSelector)})?.contains(document.activeElement)`)
  const calendarFocusTrap = await measureFocusTrap(cdp, calendarDialogSelector)
  const calendarPortalMetric = await evaluate(cdp, metricExpression())
  const saveBefore = await evaluate(cdp, "({ historyLength: history.length, search: location.search, item: new URLSearchParams(location.search).get('item') })")
  await evaluate(cdp, `document.querySelector(${JSON.stringify(calendarDialogSelector)})?.querySelector('form')?.requestSubmit(); true`)
  await waitFor(cdp, `!document.querySelector(${JSON.stringify(calendarDialogSelector)}) && !new URLSearchParams(location.search).has('item')`)
  await wait(900)
  const saveAfter = await evaluate(cdp, `({ search: location.search, item: new URLSearchParams(location.search).get('item'), dialogOpen: Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)})), historyLength: history.length, activeEditId: document.activeElement?.getAttribute('data-calendar-edit-id') })`)
  const saveClose = {
    historyLengthBefore: saveBefore.historyLength,
    historyLengthAfter: saveAfter.historyLength,
    searchBefore: saveBefore.search,
    searchAfter: saveAfter.search,
    itemBefore: saveBefore.item,
    itemAfter: saveAfter.item,
    dialogOpenAfter: saveAfter.dialogOpen,
    activeEditIdAfter: saveAfter.activeEditId,
  }

  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(augustEditSelector)}))`)
  await evaluate(cdp, `document.querySelector(${JSON.stringify(augustEditSelector)})?.click(); true`)
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)}))`)
  await evaluate(cdp, `(() => {
    const input = document.querySelector(${JSON.stringify(`${calendarDialogSelector} input[type="date"]`)});
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, '2026-10-20');
    input?.dispatchEvent(new Event('input', { bubbles: true }));
    input?.dispatchEvent(new Event('change', { bubbles: true }));
    return input?.value;
  })()`)
  await waitFor(cdp, `document.querySelector(${JSON.stringify(`${calendarDialogSelector} input[type="date"]`)})?.value === '2026-10-20'`)
  await evaluate(cdp, `document.querySelector(${JSON.stringify(calendarDialogSelector)})?.querySelector('form')?.requestSubmit(); true`)
  await waitFor(cdp, `!document.querySelector(${JSON.stringify(calendarDialogSelector)}) && document.querySelector('[data-calendar-date]')?.getAttribute('data-calendar-date') === '2026-10-20'`)
  await waitFor(cdp, "document.activeElement?.hasAttribute('data-calendar-focus-fallback') === true")
  const movedTriggerFallback = await evaluate(cdp, `({
    search: location.search,
    selectedDate: document.querySelector('[data-calendar-date]')?.getAttribute('data-calendar-date'),
    originalTriggerConnected: Boolean(document.querySelector(${JSON.stringify(augustEditSelector)})),
    fallbackFocused: document.activeElement?.hasAttribute('data-calendar-focus-fallback') ?? false,
    fallbackText: document.activeElement?.textContent?.trim() || '',
  })`)

  const waitForDelayedCalendarRequests = async (minimum) => {
    const started = Date.now()
    while (Date.now() - started < 12000) {
      if (delayedCalendarRequests.length >= minimum) return
      await wait(100)
    }
    throw new Error(`timeout: delayed calendar requests >= ${minimum}`)
  }
  const releaseDelayedCalendarRequests = async () => {
    const pending = delayedCalendarRequests.splice(0)
    let fulfilled = 0
    let canceled = 0
    for (const item of pending) {
      paused.delete(item.requestId)
      try {
        await cdp.send("Fetch.fulfillRequest", { requestId: item.requestId, ...response(calendarPayloadForRequest(item.url)) })
        fulfilled += 1
      } catch {
        canceled += 1
      }
    }
    return { attempted: pending.length, fulfilled, canceled }
  }

  scenario = { surface: "calendar", state: "calendar-cross-month" }
  const augustSelectedSearch = `?${new URLSearchParams({ view: "work", surface: "calendar", date: "2026-08-25", mode: "month", item: `calendar:${calendarOccurrence.id}` })}`
  const octoberSelectedSearch = `?${new URLSearchParams({ view: "work", surface: "calendar", date: "2026-10-20", mode: "list", item: `calendar:${octoberCalendarOccurrence.id}` })}`
  await cdp.send("Page.navigate", { url: `${APP_URL}${augustSelectedSearch}` })
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)}))`)
  await evaluate(cdp, `history.pushState(null, '', ${JSON.stringify(octoberSelectedSearch)}); window.dispatchEvent(new PopStateEvent('popstate')); true`)
  await waitFor(cdp, `location.search === ${JSON.stringify(octoberSelectedSearch)}`)
  await waitForDelayedCalendarRequests(1)
  await wait(350)
  const octoberPendingBeforeBack = await evaluate(cdp, `({ search: location.search, item: new URLSearchParams(location.search).get('item'), dialogOpen: Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)})), loadingVisible: document.body.innerText.includes('Calendar 원장을 읽는 중') })`)
  await evaluate(cdp, "history.back(); true")
  await waitFor(cdp, `location.search === ${JSON.stringify(augustSelectedSearch)}`)
  await waitFor(cdp, `document.querySelector(${JSON.stringify(calendarDialogSelector)})?.querySelector('input')?.value === ${JSON.stringify(calendarOccurrence.title)}`)
  const augustAfterBack = await evaluate(cdp, `({ search: location.search, item: new URLSearchParams(location.search).get('item'), title: document.querySelector(${JSON.stringify(calendarDialogSelector)})?.querySelector('input')?.value || '' })`)
  const lateOctoberRelease = await releaseDelayedCalendarRequests()
  await wait(500)
  const augustAfterLateOctober = await evaluate(cdp, `({ search: location.search, item: new URLSearchParams(location.search).get('item'), title: document.querySelector(${JSON.stringify(calendarDialogSelector)})?.querySelector('input')?.value || '' })`)
  await evaluate(cdp, "history.forward(); true")
  await waitFor(cdp, `location.search === ${JSON.stringify(octoberSelectedSearch)}`)
  await waitForDelayedCalendarRequests(1)
  await wait(350)
  const octoberPendingAfterForward = await evaluate(cdp, `({ search: location.search, item: new URLSearchParams(location.search).get('item'), dialogOpen: Boolean(document.querySelector(${JSON.stringify(calendarDialogSelector)})), loadingVisible: document.body.innerText.includes('Calendar 원장을 읽는 중') })`)
  const currentOctoberRelease = await releaseDelayedCalendarRequests()
  await waitFor(cdp, `document.querySelector(${JSON.stringify(calendarDialogSelector)})?.querySelector('input')?.value === ${JSON.stringify(octoberCalendarOccurrence.title)}`)
  const octoberAfterResolve = await evaluate(cdp, `({ search: location.search, item: new URLSearchParams(location.search).get('item'), title: document.querySelector(${JSON.stringify(calendarDialogSelector)})?.querySelector('input')?.value || '' })`)
  const crossMonthRestore = { octoberPendingBeforeBack, augustAfterBack, lateOctoberRelease, augustAfterLateOctober, octoberPendingAfterForward, currentOctoberRelease, octoberAfterResolve }

  const desktopInline = Object.fromEntries(["todo", "projects"].map((surface) => {
    const reading = readings.find((item) => item.surface === surface && item.state === "selected" && item.viewport === 1280)
    return [surface, { modal: reading?.modal ?? null }]
  }))
  const interactionAssertions = {
    siblingArrowRightMovesFocus: siblingFocus.includes("일정"),
    siblingEnterNavigatesCalendar: afterEnter === calendarSearch,
    historyBackRestoresTodo: afterBack === todoSearch,
    historyForwardRestoresCalendar: afterForward === calendarSearch,
    noQueryRemainsNowAtParent: noQueryParent.search === "" && noQueryParent.activeTopTab.includes("홈") && noQueryParent.workShellPresent === false,
    calendarBothOptionalFieldsResetOnBack: calendarOptionalState.bothFieldRemoval.afterBack.date === browserToday && calendarOptionalState.bothFieldRemoval.afterBack.mode === "month",
    calendarBothOptionalFieldsRestoreOnForward: calendarOptionalState.bothFieldRemoval.afterForward.date === "2026-10-20" && calendarOptionalState.bothFieldRemoval.afterForward.mode === "list",
    calendarModeRemovalResetsIndependently: calendarOptionalState.modeFieldRemoval.afterBack.date === "2026-10-20" && calendarOptionalState.modeFieldRemoval.afterBack.mode === "month" && calendarOptionalState.modeFieldRemoval.afterForward.mode === "list",
    calendarDateRemovalResetsIndependently: calendarOptionalState.dateFieldRemoval.afterBack.date === browserToday && calendarOptionalState.dateFieldRemoval.afterBack.mode === "list" && calendarOptionalState.dateFieldRemoval.afterForward.date === "2026-10-20",
    calendarKstMidnightBackUsesNewDate: calendarMidnight.defaultBefore.date === "2026-08-25" && calendarMidnight.defaultAfterBack.date === "2026-08-26" && calendarMidnight.defaultAfterBack.search === calendarDefaultSearch,
    calendarKstMidnightTodayUsesNewDate: calendarMidnight.todayAction.date === "2026-08-26" && calendarMidnight.todayAction.search === calendarTodaySearch,
    todoArrowDownMovesFocus: Boolean(todoFirstText && todoAfterArrowDown && todoFirstText !== todoAfterArrowDown),
    todoEnterSelectsCalendarItem: todoSelectedItem?.startsWith("calendar:") === true,
    todoModalFocusEntry: todoFocusTrap.entryContained === true,
    todoModalFocusTrap: todoFocusTrap.count >= 2 && todoFocusTrap.afterForwardIndex === todoFocusTrap.firstIndex && todoFocusTrap.afterBackwardIndex === todoFocusTrap.lastIndex && todoFocusTrap.afterForwardContained && todoFocusTrap.afterBackwardContained,
    todoEscapeClosesDetail: todoAfterEscape.detailOpen === false,
    todoEscapeReturnsFocus: todoAfterEscape.activeText === todoAfterArrowDown,
    projectArrowDownMovesFocus: Boolean(projectFirstText && projectAfterArrowDown && projectFirstText !== projectAfterArrowDown),
    projectEnterSelectsItem: projectSelectedItem === "yohan-brain",
    projectModalFocusEntry: projectFocusTrap.entryContained === true,
    projectModalFocusTrap: projectFocusTrap.count >= 1 && projectFocusTrap.afterForwardIndex === projectFocusTrap.firstIndex && projectFocusTrap.afterBackwardIndex === projectFocusTrap.lastIndex && projectFocusTrap.afterForwardContained && projectFocusTrap.afterBackwardContained,
    projectEscapeClosesDetail: projectAfterEscape.detailOpen === false,
    projectEscapeReturnsFocus: projectAfterEscape.activeText === projectAfterArrowDown,
    todo360FullScreenDetailPreserved: sheet360.todo.geometry.sheet.width === 360,
    todo360BackdropCoversViewport: sheet360.todo.geometry.backdrop.width === 360 && sheet360.todo.geometry.backdrop.height === 900,
    todo360BackdropBlocksBackgroundPointer: sheet360.todo.pointerProbe.backgroundClicks === 0 && sheet360.todo.pointerProbe.dialogOpen === true && sheet360.todo.pointerProbe.targetInsideSheet === true,
    todo360BackdropClosesAndReturnsFocus: sheet360.todo.afterBackdrop.lastClickTarget === "todo" && sheet360.todo.afterBackdrop.dialogOpen === false && sheet360.todo.afterBackdrop.focusReturned === true,
    project360FullScreenDetailPreserved: sheet360.projects.geometry.sheet.width === 360,
    project360BackdropCoversViewport: sheet360.projects.geometry.backdrop.width === 360 && sheet360.projects.geometry.backdrop.height === 900,
    project360BackdropBlocksBackgroundPointer: sheet360.projects.pointerProbe.backgroundClicks === 0 && sheet360.projects.pointerProbe.dialogOpen === true && sheet360.projects.pointerProbe.targetInsideSheet === true,
    project360BackdropClosesAndReturnsFocus: sheet360.projects.afterBackdrop.lastClickTarget === "projects" && sheet360.projects.afterBackdrop.dialogOpen === false && sheet360.projects.afterBackdrop.focusReturned === true,
    todo768SheetWidthPreserved: sheet768.todo.geometry.sheet.width === 420,
    todo768BackdropCoversViewport: sheet768.todo.geometry.backdrop.width === 768 && sheet768.todo.geometry.backdrop.height === 900,
    todo768BackdropBlocksBackgroundPointer: sheet768.todo.afterBackdrop.backgroundClicks === 0 && sheet768.todo.afterBackdrop.lastClickTarget === "todo" && sheet768.todo.afterBackdrop.dialogOpen === false,
    todo768BackdropReturnsFocus: sheet768.todo.afterBackdrop.focusReturned === true,
    todo768FocusTrap: sheet768.todo.focusTrap.entryContained === true && sheet768.todo.focusTrap.afterForwardIndex === sheet768.todo.focusTrap.firstIndex && sheet768.todo.focusTrap.afterBackwardIndex === sheet768.todo.focusTrap.lastIndex,
    project768SheetWidthPreserved: sheet768.projects.geometry.sheet.width === 420,
    project768BackdropCoversViewport: sheet768.projects.geometry.backdrop.width === 768 && sheet768.projects.geometry.backdrop.height === 900,
    project768BackdropBlocksBackgroundPointer: sheet768.projects.afterBackdrop.backgroundClicks === 0 && sheet768.projects.afterBackdrop.lastClickTarget === "projects" && sheet768.projects.afterBackdrop.dialogOpen === false,
    project768BackdropReturnsFocus: sheet768.projects.afterBackdrop.focusReturned === true,
    project768FocusTrap: sheet768.projects.focusTrap.entryContained === true && sheet768.projects.focusTrap.afterForwardIndex === sheet768.projects.focusTrap.firstIndex && sheet768.projects.focusTrap.afterBackwardIndex === sheet768.projects.focusTrap.lastIndex,
    desktopTodoIsInline: desktopInline.todo.modal === null,
    desktopProjectIsInline: desktopInline.projects.modal === null,
    productionKeyRefreshRestores: refreshBefore.item === productionGoalKey && refreshAfter.item === productionGoalKey && refreshAfter.heading === refreshBefore.heading,
    todoKstMidnightRefreshUsesNewDate: todoMidnight.before.group === "todo-group-upcoming" && todoMidnight.afterRefresh.group === "todo-group-today" && todoMidnight.afterRefresh.dateLabel.includes("2026-08-26") && todoMidnight.afterRefresh.calendarFrom === "2026-08-26",
    unicodeRelativePathRoundTrips: keyEvidence.requestedUnicodeItem === unicodeItemKey && keyEvidence.parsedUnicodeItem === unicodeItemKey && keyEvidence.encodedSearch.includes("%ED%95%9C%EA%B8%80+%EB%AC%B8%EC%84%9C.md"),
    duplicateTextKeysRemainDistinct: keyEvidence.duplicateRows.length === 2 && keyEvidence.distinctDuplicateKeys === 2 && keyEvidence.parserProduced.length === 2 && keyEvidence.parserProduced.every((item) => keyEvidence.duplicateRows.some((row) => row.key === item.renderedKey)),
    todoLateOlderResponseCannotOverwriteRefresh: todoOverlapRace.beforeLate.newestVisible === true && todoOverlapRace.beforeLate.olderVisible === false && todoOverlapRace.afterLate.newestVisible === true && todoOverlapRace.afterLate.olderVisible === false,
    sourceFailurePreservesSelection: sourceFailure.item === productionGoalKey && sourceFailure.detailOpen === false,
    detailFailurePreservesProject: detailFailure.project === "yohan-control-tower" && detailFailure.listItems === 2 && detailFailure.errorVisible === true,
    todoStaleReplaceAvoidsBackTrap: staleHistory.todo.canonicalized === todoSearch && staleHistory.todo.afterBack === calendarSearch,
    projectStaleReplaceAvoidsBackTrap: staleHistory.projects.canonicalized === projectsSearch && staleHistory.projects.afterBack === todoSearch,
    calendarStaleReplaceAvoidsBackTrap: staleHistory.calendar.canonicalized === `?${new URLSearchParams({ view: "work", surface: "calendar", date: "2026-08-25", mode: "month" })}` && staleHistory.calendar.afterBack === todoSearch,
    calendarModalFocusEntry: calendarFocusTrap.entryContained === true,
    calendarModalFocusTrap: calendarFocusTrap.count >= 2 && calendarFocusTrap.afterForwardIndex === calendarFocusTrap.firstIndex && calendarFocusTrap.afterBackwardIndex === calendarFocusTrap.lastIndex && calendarFocusTrap.afterForwardContained && calendarFocusTrap.afterBackwardContained,
    calendarPortalTargetsMeasured: calendarPortalMetric.portalControlTargets.total > 0 && calendarPortalMetric.portalControlTargets.measurements.length === calendarPortalMetric.portalControlTargets.total && calendarPortalMetric.portalControlTargets.measurements.every((item) => item.width >= 44 && item.height >= 44) && calendarPortalMetric.portalControlTargets.failures.length === 0,
    calendarValidSelectionBackClosesDialog: validSelectionOpen.item === `calendar:${calendarOccurrence.id}` && validSelectionBackClose.item === null && validSelectionBackClose.dialogOpen === false,
    calendarValidSelectionBackReturnsFocus: validSelectionBackClose.activeEditId === calendarOccurrence.id,
    calendarUserCloseReturnsExactEditTrigger: userCloseFocus.dialogOpen === false && userCloseFocus.activeEditId === calendarOccurrence.id && userCloseFocus.fallbackFocused === false,
    calendarSaveClearsItemWithoutPush: saveClose.itemBefore === `calendar:${calendarOccurrence.id}` && saveClose.itemAfter === null && saveClose.dialogOpenAfter === false && saveClose.historyLengthAfter === saveClose.historyLengthBefore,
    calendarSaveReturnsExactEditTrigger: saveClose.activeEditIdAfter === calendarOccurrence.id,
    calendarMovedTriggerUsesFocusFallback: movedTriggerFallback.selectedDate === "2026-10-20" && movedTriggerFallback.originalTriggerConnected === false && movedTriggerFallback.fallbackFocused === true && movedTriggerFallback.fallbackText === "오늘",
    calendarCrossMonthDoesNotClearEarly: octoberPendingBeforeBack.search === octoberSelectedSearch && octoberPendingBeforeBack.item === `calendar:${octoberCalendarOccurrence.id}` && octoberPendingBeforeBack.dialogOpen === false && octoberPendingBeforeBack.loadingVisible === true,
    calendarCrossMonthBackRestoresAugust: augustAfterBack.item === `calendar:${calendarOccurrence.id}` && augustAfterBack.title === calendarOccurrence.title,
    calendarLateOctoberCannotReplaceAugust: augustAfterLateOctober.item === `calendar:${calendarOccurrence.id}` && augustAfterLateOctober.title === calendarOccurrence.title,
    calendarCrossMonthForwardDoesNotClearEarly: octoberPendingAfterForward.item === `calendar:${octoberCalendarOccurrence.id}` && octoberPendingAfterForward.dialogOpen === false && octoberPendingAfterForward.loadingVisible === true,
    calendarCrossMonthForwardResolvesOctober: currentOctoberRelease.fulfilled >= 1 && octoberAfterResolve.item === `calendar:${octoberCalendarOccurrence.id}` && octoberAfterResolve.title === octoberCalendarOccurrence.title,
  }

  const result = {
    generatedAt: new Date().toISOString(),
    appUrl: APP_URL,
    browser: {
      protocolVersion: browserVersion.protocolVersion,
      product: browserVersion.product,
      revision: browserVersion.revision,
      userAgent: browserVersion.userAgent,
      jsVersion: browserVersion.jsVersion,
      navigatorUserAgent: await evaluate(cdp, "navigator.userAgent"),
    },
    viewports,
    readings,
    navigation: { siblingFocus, afterEnter, afterBack, afterForward, noQueryParent, calendarOptionalState, calendarMidnight, staleHistory },
    keyboard: {
      todo: { firstText: todoFirstText, afterArrowDown: todoAfterArrowDown, selectedItem: todoSelectedItem, focusTrap: todoFocusTrap, afterEscape: todoAfterEscape },
      projects: { firstText: projectFirstText, afterArrowDown: projectAfterArrowDown, selectedItem: projectSelectedItem, focusTrap: projectFocusTrap, afterEscape: projectAfterEscape },
      calendar: { focusTrap: calendarFocusTrap, validSelectionOpen, validSelectionBackClose, userCloseFocus, movedTriggerFallback },
    },
    accessibility: { desktopInline, sheet360, sheet768, calendarPortalTargets: calendarPortalMetric.portalControlTargets, calendarDoubleScroll: calendarPortalMetric.doubleScroll },
    refreshRestore: { before: refreshBefore, after: refreshAfter },
    todoMidnight,
    keyEvidence,
    detailFailure: { sourceFailure, project: detailFailure },
    todoOverlapRace,
    saveClose,
    crossMonthRestore,
    consoleErrors,
    interactionAssertions,
    summary: {
      scenarios: readings.length,
      interactionAssertions: Object.keys(interactionAssertions).length,
      overflowFailures: readings.filter((reading) => reading.overflow !== 0).length,
      doubleScrollFailures: readings.filter((reading) => reading.doubleScroll).length + (calendarPortalMetric.doubleScroll ? 1 : 0),
      h1Failures: readings.filter((reading) => reading.h1Count !== 1).length,
      targetFailures: readings.reduce((count, reading) => count + reading.shortTargets.length, 0),
      portalTargetFailures: readings.reduce((count, reading) => count + reading.portalControlTargets.failures.length, 0) + calendarPortalMetric.portalControlTargets.failures.length,
      consoleErrors: consoleErrors.length,
      minimumParagraphPx: Math.min(...readings.map((reading) => reading.minimumParagraphPx ?? 999)),
    },
  }
  await writeFile(join(OUTPUT_DIR, "browser-qa-results.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8")
  cdp.close()

  if (result.summary.overflowFailures || result.summary.doubleScrollFailures || result.summary.h1Failures || result.summary.targetFailures || result.summary.portalTargetFailures || result.summary.consoleErrors || result.summary.minimumParagraphPx < 14 || Object.values(interactionAssertions).some((value) => value !== true)) {
    console.error(JSON.stringify({ summary: result.summary, interactionAssertions }))
    process.exit(1)
  }
  console.log(JSON.stringify(result.summary))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
