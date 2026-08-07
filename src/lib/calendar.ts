import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import matter from "gray-matter"
import { stringify } from "yaml"

import { resolveCalendarRoot } from "@/lib/paths"
import { createTtlCache } from "@/lib/server-cache"
import type {
  CalendarCreateInput,
  CalendarFileIssue,
  CalendarItem,
  CalendarItemKind,
  CalendarItemStatus,
  CalendarOccurrence,
  CalendarRecurrence,
} from "@/lib/types"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const ID_RE = /^cal_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_RANGE_DAYS = 400
const MAX_OCCURRENCES = 10_000
const ITEM_KINDS = new Set<CalendarItemKind>(["event", "task"])
const ITEM_STATUSES = new Set<CalendarItemStatus>(["open", "done", "canceled"])
const RECURRENCES = new Set<CalendarRecurrence>(["none", "daily", "weekly", "monthly"])

interface CalendarReadResult {
  items: CalendarItem[]
  issues: CalendarFileIssue[]
}

export class CalendarInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CalendarInputError"
  }
}

const calendarCache = createTtlCache<CalendarReadResult>({ ttlMs: 2_000 })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function parseDate(value: string, label: string): Date {
  if (!DATE_RE.test(value)) throw new CalendarInputError(`${label}은 YYYY-MM-DD 형식이어야 합니다.`)
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new CalendarInputError(`${label}이 실제 날짜가 아닙니다.`)
  }
  return date
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function diffDays(base: Date, candidate: Date): number {
  return Math.round((candidate.getTime() - base.getTime()) / 86_400_000)
}

function normalizeTime(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string" || !TIME_RE.test(value)) {
    throw new CalendarInputError(`${label}은 HH:mm 형식이어야 합니다.`)
  }
  return value
}

function normalizeTitle(value: unknown): string {
  if (typeof value !== "string") throw new CalendarInputError("제목은 문자열이어야 합니다.")
  const title = value.trim()
  if (!title || title.length > 160) throw new CalendarInputError("제목은 1~160자여야 합니다.")
  return title
}

function normalizeNotes(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string" || value.length > 10_000) {
    throw new CalendarInputError("메모는 10,000자 이하여야 합니다.")
  }
  return value.trim()
}

function normalizeCompletedDates(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new CalendarInputError("completed_dates는 날짜 문자열 배열이어야 합니다.")
  }
  const dates = value.map((entry) => entry.trim())
  dates.forEach((date) => parseDate(date, "completed_dates 항목"))
  return [...new Set(dates)].sort()
}

function parseCalendarItem(raw: string, file: string): CalendarItem {
  const parsed = matter(raw)
  const data: unknown = parsed.data
  if (!isRecord(data)) throw new CalendarInputError("frontmatter가 객체가 아닙니다.")
  if (data.calendar_format !== 1) throw new CalendarInputError("calendar_format 1만 지원합니다.")

  const id = readString(data, "id")
  const kind = readString(data, "kind") as CalendarItemKind | null
  const status = readString(data, "status") as CalendarItemStatus | null
  const recurrence = readString(data, "recurrence") as CalendarRecurrence | null
  const title = normalizeTitle(data.title)
  const date = readString(data, "date")
  const createdAt = readString(data, "created_at")
  const updatedAt = readString(data, "updated_at")

  if (!id || !ID_RE.test(id) || file !== `${id}.md`) throw new CalendarInputError("id와 파일명이 일치하지 않습니다.")
  if (!kind || !ITEM_KINDS.has(kind)) throw new CalendarInputError("kind는 event 또는 task여야 합니다.")
  if (!status || !ITEM_STATUSES.has(status)) throw new CalendarInputError("status가 허용값이 아닙니다.")
  if (!recurrence || !RECURRENCES.has(recurrence)) throw new CalendarInputError("recurrence가 허용값이 아닙니다.")
  if (!date) throw new CalendarInputError("date가 없습니다.")
  parseDate(date, "date")

  const startTime = normalizeTime(data.start_time, "start_time")
  const endTime = normalizeTime(data.end_time, "end_time")
  if (kind === "task" && endTime) throw new CalendarInputError("task에는 end_time을 사용할 수 없습니다.")
  if (endTime && !startTime) throw new CalendarInputError("end_time에는 start_time이 필요합니다.")
  if (startTime && endTime && endTime <= startTime) throw new CalendarInputError("end_time은 start_time보다 뒤여야 합니다.")

  const intervalRaw = data.recurrence_interval
  const recurrenceInterval = typeof intervalRaw === "number" ? intervalRaw : Number(intervalRaw)
  if (!Number.isInteger(recurrenceInterval) || recurrenceInterval < 1 || recurrenceInterval > 365) {
    throw new CalendarInputError("recurrence_interval은 1~365 정수여야 합니다.")
  }
  const recurrenceUntil = readString(data, "recurrence_until")
  if (recurrenceUntil) {
    parseDate(recurrenceUntil, "recurrence_until")
    if (recurrenceUntil < date) throw new CalendarInputError("recurrence_until은 시작일보다 빠를 수 없습니다.")
  }
  if (!createdAt || Number.isNaN(Date.parse(createdAt)) || !updatedAt || Number.isNaN(Date.parse(updatedAt))) {
    throw new CalendarInputError("created_at 또는 updated_at이 ISO 날짜가 아닙니다.")
  }

  return {
    id,
    kind,
    title,
    date,
    startTime,
    endTime,
    status,
    recurrence,
    recurrenceInterval,
    recurrenceUntil,
    completedDates: normalizeCompletedDates(data.completed_dates),
    notes: parsed.content.trim(),
    createdAt,
    updatedAt,
  }
}

function serializeCalendarItem(item: CalendarItem): string {
  const frontmatter = stringify({
    calendar_format: 1,
    id: item.id,
    kind: item.kind,
    title: item.title,
    date: item.date,
    start_time: item.startTime,
    end_time: item.endTime,
    status: item.status,
    recurrence: item.recurrence,
    recurrence_interval: item.recurrenceInterval,
    recurrence_until: item.recurrenceUntil,
    completed_dates: item.completedDates,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }, {
    lineWidth: 0,
    defaultKeyType: "PLAIN",
    // YAML 1.1 parser가 2026-08-07을 Date 객체로 암묵 변환하지 않게 모든 값 문자열을 인용한다.
    defaultStringType: "QUOTE_DOUBLE",
  })
  return `---\n${frontmatter}---\n${item.notes ? `\n${item.notes}\n` : ""}`
}

async function readCalendarItems(root: string): Promise<CalendarReadResult> {
  const itemsDir = join(/* turbopackIgnore: true */ root, "items")
  let files: string[]
  try {
    files = (await readdir(itemsDir)).filter((file) => file.endsWith(".md")).sort()
  } catch (error: unknown) {
    if (isRecord(error) && error.code === "ENOENT") return { items: [], issues: [] }
    throw error
  }

  const settled = await Promise.all(files.map(async (file) => {
    const raw = await readFile(join(/* turbopackIgnore: true */ itemsDir, file), "utf8")
    return { file, item: parseCalendarItem(raw, file) }
  }).map((promise) => promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error })
  )))

  const items: CalendarItem[] = []
  const issues: CalendarFileIssue[] = []
  settled.forEach((result, index) => {
    if (result.ok) items.push(result.value.item)
    else issues.push({ file: files[index], message: result.error instanceof Error ? result.error.message : String(result.error) })
  })
  return { items, issues }
}

async function loadCalendarItems(rootOverride?: string): Promise<CalendarReadResult> {
  const root = rootOverride ?? resolveCalendarRoot()
  if (rootOverride) return readCalendarItems(root)
  return calendarCache.get(() => readCalendarItems(root))
}

function occursOn(item: CalendarItem, candidate: Date): boolean {
  const base = parseDate(item.date, "date")
  if (candidate < base) return false
  const candidateYmd = formatDate(candidate)
  if (item.recurrenceUntil && candidateYmd > item.recurrenceUntil) return false
  if (item.recurrence === "none") return candidateYmd === item.date

  const dayDiff = diffDays(base, candidate)
  if (item.recurrence === "daily") return dayDiff % item.recurrenceInterval === 0
  if (item.recurrence === "weekly") return dayDiff % (7 * item.recurrenceInterval) === 0

  const monthDiff = (candidate.getUTCFullYear() - base.getUTCFullYear()) * 12
    + candidate.getUTCMonth() - base.getUTCMonth()
  return candidate.getUTCDate() === base.getUTCDate() && monthDiff % item.recurrenceInterval === 0
}

export function expandCalendarItems(items: CalendarItem[], from: string, to: string): CalendarOccurrence[] {
  const start = parseDate(from, "from")
  const end = parseDate(to, "to")
  const rangeDays = diffDays(start, end)
  if (rangeDays < 0) throw new CalendarInputError("to는 from보다 빠를 수 없습니다.")
  if (rangeDays > MAX_RANGE_DAYS) throw new CalendarInputError(`조회 범위는 ${MAX_RANGE_DAYS}일 이하여야 합니다.`)

  const occurrences: CalendarOccurrence[] = []
  for (let offset = 0; offset <= rangeDays; offset += 1) {
    const candidate = addUtcDays(start, offset)
    const date = formatDate(candidate)
    for (const item of items) {
      if (!occursOn(item, candidate)) continue
      const recurring = item.recurrence !== "none"
      const status = item.kind === "task" && recurring && item.completedDates.includes(date)
        ? "done"
        : item.status
      occurrences.push({
        id: `${item.id}@${date}`,
        sourceId: item.id,
        kind: item.kind,
        title: item.title,
        date,
        startTime: item.startTime,
        endTime: item.endTime,
        status,
        recurring,
        notes: item.notes,
      })
      if (occurrences.length > MAX_OCCURRENCES) {
        throw new CalendarInputError(`발생 일정이 ${MAX_OCCURRENCES}개를 초과했습니다. 조회 범위나 반복 규칙을 줄이세요.`)
      }
    }
  }

  return occurrences.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    const timeCompare = (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")
    if (timeCompare !== 0) return timeCompare
    if (a.kind !== b.kind) return a.kind === "event" ? -1 : 1
    return a.title.localeCompare(b.title, "ko")
  })
}

export async function listCalendarRange(from: string, to: string, rootOverride?: string) {
  // 입력 범위는 파일 스캔 전에 검증해 비정상 요청이 외부 I/O를 유발하지 않게 한다.
  expandCalendarItems([], from, to)
  const result = await loadCalendarItems(rootOverride)
  return {
    occurrences: expandCalendarItems(result.items, from, to),
    sourceItems: result.items.length,
    issues: result.issues,
  }
}

function normalizeCreateInput(input: CalendarCreateInput): Omit<CalendarItem, "id" | "createdAt" | "updatedAt"> {
  const kind = input.kind
  if (!ITEM_KINDS.has(kind)) throw new CalendarInputError("kind는 event 또는 task여야 합니다.")
  const title = normalizeTitle(input.title)
  parseDate(input.date, "date")
  const startTime = normalizeTime(input.startTime, "startTime")
  const endTime = normalizeTime(input.endTime, "endTime")
  if (kind === "task" && endTime) throw new CalendarInputError("할 일에는 종료 시간을 사용할 수 없습니다.")
  if (endTime && !startTime) throw new CalendarInputError("종료 시간에는 시작 시간이 필요합니다.")
  if (startTime && endTime && endTime <= startTime) throw new CalendarInputError("종료 시간은 시작 시간보다 뒤여야 합니다.")

  const recurrence = input.recurrence ?? "none"
  if (!RECURRENCES.has(recurrence)) throw new CalendarInputError("지원하지 않는 반복 규칙입니다.")
  const recurrenceInterval = input.recurrenceInterval ?? 1
  if (!Number.isInteger(recurrenceInterval) || recurrenceInterval < 1 || recurrenceInterval > 365) {
    throw new CalendarInputError("반복 간격은 1~365 정수여야 합니다.")
  }
  const recurrenceUntil = input.recurrenceUntil || null
  if (recurrenceUntil) {
    parseDate(recurrenceUntil, "반복 종료일")
    if (recurrenceUntil < input.date) throw new CalendarInputError("반복 종료일은 시작일보다 빠를 수 없습니다.")
  }

  return {
    kind,
    title,
    date: input.date,
    startTime,
    endTime,
    status: "open",
    recurrence,
    recurrenceInterval,
    recurrenceUntil: recurrence === "none" ? null : recurrenceUntil,
    completedDates: [],
    notes: normalizeNotes(input.notes),
  }
}

export async function createCalendarItem(input: CalendarCreateInput, rootOverride?: string): Promise<CalendarItem> {
  const root = rootOverride ?? resolveCalendarRoot()
  const normalized = normalizeCreateInput(input)
  const now = new Date().toISOString()
  const item: CalendarItem = {
    id: `cal_${randomUUID()}`,
    ...normalized,
    createdAt: now,
    updatedAt: now,
  }
  const itemsDir = join(/* turbopackIgnore: true */ root, "items")
  await mkdir(itemsDir, { recursive: true })
  await writeFile(join(/* turbopackIgnore: true */ itemsDir, `${item.id}.md`), serializeCalendarItem(item), {
    encoding: "utf8",
    flag: "wx",
  })
  calendarCache.clear()
  return item
}

export async function setCalendarTaskCompletion(
  id: string,
  occurrenceDate: string,
  done: boolean,
  rootOverride?: string
): Promise<CalendarItem> {
  if (!ID_RE.test(id)) throw new CalendarInputError("Calendar 항목 ID 형식이 올바르지 않습니다.")
  parseDate(occurrenceDate, "occurrenceDate")
  const root = rootOverride ?? resolveCalendarRoot()
  const file = join(/* turbopackIgnore: true */ root, "items", `${id}.md`)
  if (!existsSync(file)) throw new CalendarInputError("Calendar 항목을 찾을 수 없습니다.")
  const item = parseCalendarItem(await readFile(file, "utf8"), `${id}.md`)
  if (item.kind !== "task") throw new CalendarInputError("할 일만 완료 처리할 수 있습니다.")
  if (!occursOn(item, parseDate(occurrenceDate, "occurrenceDate"))) {
    throw new CalendarInputError("이 날짜는 해당 반복 항목의 발생일이 아닙니다.")
  }

  if (item.recurrence === "none") {
    item.status = done ? "done" : "open"
  } else {
    const completed = new Set(item.completedDates)
    if (done) completed.add(occurrenceDate)
    else completed.delete(occurrenceDate)
    item.completedDates = [...completed].sort()
  }
  item.updatedAt = new Date().toISOString()
  await writeFile(file, serializeCalendarItem(item), "utf8")
  calendarCache.clear()
  return item
}
