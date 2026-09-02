import type { CalendarCreateInput, CalendarItemKind } from "@/lib/types"

export const DAILY_SURFACE = "daily" as const

export const DAILY_VISUAL = {
  bg: "#ffffff",
  ink: "#2a2a2a",
  muted: "#9a9692",
  line: "#eeeae6",
  rose: "#f0a3b0",
  roseDeep: "#e07a8c",
  roseFill: "#fde8ec",
  checkMark: "#ffffff",
  eventAccent: "#8ec8dc",
  checkBorder: "#e0c8ce",
  toolInk: "#5c5854",
  quickFill: "#faf7f6",
  outMonth: "#c9c4be",
  strike: "#b7b2ad",
  selectedWash: "rgba(253, 232, 236, 0.28)",
  pill: {
    pink: "#f7d5dc",
    blue: "#cfe6f4",
    cyan: "#c8e8ee",
    mint: "#d4eadc",
    lav: "#e3daf3",
    peach: "#f6dfd0",
    sand: "#eee8e0",
    gray: "#ebe8e4",
  },
} as const

export const DAILY_CSS_VARS = {
  bg: "--daily-bg",
  ink: "--daily-ink",
  muted: "--daily-muted",
  line: "--daily-line",
  rose: "--daily-rose",
  roseDeep: "--daily-rose-deep",
  roseFill: "--daily-rose-fill",
  pillPink: "--daily-pill-pink",
  pillBlue: "--daily-pill-blue",
  pillCyan: "--daily-pill-cyan",
  pillMint: "--daily-pill-mint",
  pillLav: "--daily-pill-lav",
  pillPeach: "--daily-pill-peach",
  pillSand: "--daily-pill-sand",
  pillGray: "--daily-pill-gray",
} as const

export const DAILY_KIND_PILL = {
  event: DAILY_VISUAL.pill.cyan,
  task: DAILY_VISUAL.pill.pink,
} as const satisfies Record<CalendarItemKind, string>

const KIND_ALLOWLIST = new Set<CalendarItemKind>(["event", "task"])

export function pillColorForKind(kind: CalendarItemKind | string): string {
  if (!KIND_ALLOWLIST.has(kind as CalendarItemKind)) return DAILY_VISUAL.pill.sand
  return kind === "event" ? DAILY_KIND_PILL.event : DAILY_KIND_PILL.task
}

export function buildQuickAddTaskInput(date: string, title: string): CalendarCreateInput | null {
  const trimmed = title.trim()
  if (!trimmed) return null
  return {
    kind: "task",
    title: trimmed,
    date,
  }
}
