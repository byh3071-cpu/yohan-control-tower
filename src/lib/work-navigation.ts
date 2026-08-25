export const WORK_SURFACES = ["todo", "calendar", "projects"] as const
export type WorkSurface = (typeof WORK_SURFACES)[number]
export type CalendarWorkMode = "month" | "list"
export type TopViewAction = "no-op" | "navigate-work" | "leave-work"

export interface CalendarViewState {
  selectedDate: string
  month: string
  mode: CalendarWorkMode
}

export function seoulDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now)
}

export function resolveCalendarViewState(
  date: string | undefined,
  mode: CalendarWorkMode | undefined,
  today: string,
): CalendarViewState {
  const selectedDate = date ?? today
  return {
    selectedDate,
    month: selectedDate.slice(0, 7),
    mode: mode ?? "month",
  }
}

export function resolveTopViewAction(activeView: string, targetView: string): TopViewAction {
  if (targetView !== "projects") return "leave-work"
  return activeView === "projects" ? "no-op" : "navigate-work"
}

export type WorkLocation =
  | { kind: "now" }
  | {
      kind: "work"
      surface: WorkSurface
      date?: string
      mode?: CalendarWorkMode
      item?: string
      mission?: string
      project?: string
    }

const WORK_SURFACE_SET = new Set<string>(WORK_SURFACES)
const CALENDAR_MODE_SET = new Set<string>(["month", "list"])
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:@#-]{0,127}$/
const SAFE_ITEM_PAYLOAD = /^[\p{L}\p{N}][\p{L}\p{N} ._@#/-]{0,510}$/u
const WORK_ITEM_SOURCE_SET = new Set(["goal", "doc", "calendar"])

function paramsFrom(input: string | URLSearchParams): URLSearchParams {
  if (input instanceof URLSearchParams) return new URLSearchParams(input.toString())
  const query = input.startsWith("?") ? input.slice(1) : input
  return new URLSearchParams(query)
}

function safeToken(value: string | null): string | undefined {
  const normalized = value?.trim()
  return normalized && SAFE_TOKEN.test(normalized) ? normalized : undefined
}

function safeItemKey(value: string | null, surface: Extract<WorkSurface, "todo" | "calendar">): string | undefined {
  if (!value || value !== value.trim() || /[\u0000-\u001f\u007f-\u009f\\]/.test(value)) return undefined
  const separator = value.indexOf(":")
  if (separator < 1) return undefined
  const source = value.slice(0, separator)
  const payload = value.slice(separator + 1)
  if (!WORK_ITEM_SOURCE_SET.has(source) || !SAFE_ITEM_PAYLOAD.test(payload)) return undefined
  if (surface === "calendar" && source !== "calendar") return undefined
  if (payload.startsWith("/") || /^[A-Za-z]:/.test(payload)) return undefined
  const segments = payload.split("/")
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) return undefined
  if (source === "calendar" && segments.length !== 1) return undefined
  return `${source}:${payload}`
}

function normalizeDate(value: string | null): string | undefined {
  const match = value?.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function parseWorkSearch(input: string | URLSearchParams): WorkLocation {
  const params = paramsFrom(input)
  if (params.get("view") !== "work") return { kind: "now" }

  const rawSurface = params.get("surface")
  const surface = WORK_SURFACE_SET.has(rawSurface ?? "") ? rawSurface as WorkSurface : "todo"
  const item = surface === "projects" ? undefined : safeItemKey(params.get("item"), surface)

  if (surface === "calendar") {
    const rawMode = params.get("mode")
    return {
      kind: "work",
      surface,
      ...(normalizeDate(params.get("date")) ? { date: normalizeDate(params.get("date")) } : {}),
      ...(CALENDAR_MODE_SET.has(rawMode ?? "") ? { mode: rawMode as CalendarWorkMode } : {}),
      ...(item ? { item } : {}),
    }
  }

  if (surface === "projects") {
    const mission = safeToken(params.get("mission"))
    const project = safeToken(params.get("project"))
    return {
      kind: "work",
      surface,
      ...(mission ? { mission } : {}),
      ...(project ? { project } : {}),
    }
  }

  return { kind: "work", surface, ...(item ? { item } : {}) }
}

export function serializeWorkLocation(location: WorkLocation): string {
  if (location.kind === "now") return ""
  const params = new URLSearchParams()
  params.set("view", "work")
  params.set("surface", location.surface)
  if (location.surface === "calendar") {
    const date = normalizeDate(location.date ?? null)
    if (date) params.set("date", date)
    if (location.mode && CALENDAR_MODE_SET.has(location.mode)) params.set("mode", location.mode)
    const item = safeItemKey(location.item ?? null, "calendar")
    if (item) params.set("item", item)
  } else if (location.surface === "projects") {
    const mission = safeToken(location.mission ?? null)
    const project = safeToken(location.project ?? null)
    if (mission) params.set("mission", mission)
    if (project) params.set("project", project)
  } else {
    const item = safeItemKey(location.item ?? null, "todo")
    if (item) params.set("item", item)
  }
  return `?${params.toString()}`
}

export function canonicalizeWorkSearch(input: string | URLSearchParams): string {
  return serializeWorkLocation(parseWorkSearch(input))
}
