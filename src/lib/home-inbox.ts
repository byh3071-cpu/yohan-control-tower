import type { InboxItem, InboxItemStatus, InboxStage } from "@/lib/types"

export const INBOX_STATUS_LABEL: Record<InboxItemStatus, string> = {
  queued: "대기",
  processing: "정제 중",
  review_required: "검토 대기",
  completed: "완료",
  action_required: "조치 필요",
  failed: "실패",
}

export const INBOX_STAGE_LABEL: Record<InboxStage, string> = {
  captured: "수집됨",
  triaged: "1차 분류",
  deep_analyzed: "깊이 분석",
  decided: "사람 결정",
  promoted: "Brain 승격됨",
}

const WINDOWS_ABS = /(?:^|[\s"'(])(?:[a-zA-Z]:[\\/]|\\\\)/
const UNIX_ABS = /(?:^|[\s"'(])\/(?:Users|home|var|tmp|etc|opt|mnt)\b/
const BARE_HASH = /^[a-f0-9]{32,64}$/i
const HASH_PREFIX = /\b(?:sha256:?|hash)[:\s-]*[a-f0-9]{32,}\b/i
const REL_REPO_FILE = /(?:^|[\s])(?:[\w.-]+\/)+[\w.-]+\.(?:md|ya?ml|jsonl|tsx?|jsx?)\b/i

type Fetcher = typeof fetch

export interface HomePeekView {
  title: string
  excerpt: string | null
  source: string | null
  sourceUrl: string | null
  statusLabel: string | null
  status: InboxItemStatus
  stageLabel: string | null
  summary: string | null
  keyPoints: string[]
  uncertainties: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function inboxError(value: unknown, fallback: string): string {
  if (isRecord(value) && typeof value.error === "string" && value.error.trim()) {
    return value.error.trim()
  }
  return fallback
}

export function looksLikeInternalPath(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (WINDOWS_ABS.test(trimmed) || UNIX_ABS.test(trimmed)) return true
  if (BARE_HASH.test(trimmed) || HASH_PREFIX.test(trimmed)) return true
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return false
  return REL_REPO_FILE.test(trimmed)
}

export function publicText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.replace(/\s+/g, " ").trim()
  if (!trimmed) return null
  if (looksLikeInternalPath(trimmed)) return null
  return trimmed
}

export function parseInboxTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

export function inboxRecencyMs(item: Pick<InboxItem, "updated_at" | "created_at">): number {
  return parseInboxTimestamp(item.updated_at)
    ?? parseInboxTimestamp(item.created_at)
    ?? Number.NEGATIVE_INFINITY
}

export function sortInboxItemsByRecency(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => {
    const delta = inboxRecencyMs(b) - inboxRecencyMs(a)
    if (delta !== 0) return delta
    return a.id.localeCompare(b.id)
  })
}

export function latestActiveInboxItem(items: InboxItem[]): InboxItem | null {
  return sortInboxItemsByRecency(items)[0] ?? null
}

export function findInboxItemById(items: InboxItem[], id: string | null | undefined): InboxItem | null {
  if (!id) return null
  return items.find((item) => item.id === id) ?? null
}

/** 선택한 id만 피크한다. 없으면 null — items[0]으로 대체하지 않는다. */
export function resolvePeekSelection(items: InboxItem[], preferredId: string | null): InboxItem | null {
  return findInboxItemById(items, preferredId)
}

export function parseEnqueueItemId(value: unknown): string | null {
  if (!isRecord(value)) return null
  if (isRecord(value.item) && typeof value.item.id === "string" && value.item.id.trim()) {
    return value.item.id.trim()
  }
  if (typeof value.id === "string" && value.id.trim()) return value.id.trim()
  return null
}

export function parseInboxDashboardItems(value: unknown): InboxItem[] {
  if (!isRecord(value) || value.ok !== true) {
    throw new Error(inboxError(value, "인박스 상태 조회 실패"))
  }
  if (!Array.isArray(value.items)) {
    throw new Error("인박스 목록 형식이 올바르지 않습니다.")
  }
  return value.items.filter((item): item is InboxItem => {
    return isRecord(item) && typeof item.id === "string" && item.id.trim().length > 0
  })
}

function hostnameOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.hostname
  } catch {
    return null
  }
}

export function excerptFrom(text: string | null | undefined, max = 220): string | null {
  const compact = publicText(text)
  if (!compact) return null
  if (compact.length <= max) return compact
  return `${compact.slice(0, max).trimEnd()}…`
}

export function inboxItemTitle(item: InboxItem): string {
  const candidates = [
    item.deep?.title,
    item.triage?.source_summary,
    item.envelope.user_note,
    excerptFrom(item.envelope.raw_text, 80),
    hostnameOf(item.canonical_url),
  ]
  for (const candidate of candidates) {
    const text = publicText(candidate)
    if (text) return text
  }
  return "제목 없는 항목"
}

function humanPlatform(platform: string): string | null {
  const normalized = platform.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes("youtube") || normalized === "yt") return "YouTube"
  if (normalized.includes("telegram")) return "Telegram"
  if (normalized === "web") return "웹"
  if (normalized === "local" || normalized === "browser") return "직접 입력"
  if (normalized === "notion") return "Notion"
  return publicText(platform)
}

function humanChannel(channel: string): string | null {
  const normalized = channel.trim().toLowerCase()
  if (!normalized) return null
  if (normalized === "browser") return "브라우저"
  if (normalized === "cli") return "CLI"
  return publicText(channel)
}

export function inboxSourceLabel(item: InboxItem): string | null {
  const parts: string[] = []
  const platform = humanPlatform(item.platform)
  const channel = humanChannel(item.capture_channel)
  const host = hostnameOf(item.canonical_url)
  if (platform) parts.push(platform)
  if (channel && channel !== platform) parts.push(channel)
  if (host) parts.push(host)
  return parts.length > 0 ? parts.join(" · ") : null
}

function publicList(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map((value) => publicText(value))
    .filter((value): value is string => value !== null)
}

export function buildHomePeekView(item: InboxItem): HomePeekView {
  const title = inboxItemTitle(item)
  const summary = publicText(item.deep?.summary) ?? publicText(item.triage?.source_summary)
  const excerpt = excerptFrom(item.envelope.raw_text, 220)
  const distinctExcerpt = excerpt && excerpt !== title && excerpt !== summary ? excerpt : null
  const distinctSummary = summary && summary !== title ? summary : summary === title ? null : summary

  return {
    title,
    excerpt: distinctExcerpt,
    source: inboxSourceLabel(item),
    sourceUrl: hostnameOf(item.canonical_url) ? item.canonical_url : null,
    statusLabel: INBOX_STATUS_LABEL[item.status] ?? null,
    status: item.status,
    stageLabel: item.stage === "promoted" ? INBOX_STAGE_LABEL.promoted : null,
    summary: distinctSummary,
    keyPoints: publicList(item.deep?.key_points),
    uncertainties: publicList(item.deep?.uncertainties),
  }
}

export async function fetchInboxItems(fetcher: Fetcher = fetch): Promise<InboxItem[]> {
  let response: Response
  try {
    response = await fetcher(`/api/inbox?t=${Date.now()}`, { cache: "no-store" })
  } catch {
    throw new Error("인박스 네트워크 오류")
  }

  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new Error("인박스 응답을 읽지 못했습니다.")
  }

  if (!response.ok) {
    throw new Error(inboxError(value, `인박스 조회 실패 (HTTP ${response.status})`))
  }

  return sortInboxItemsByRecency(parseInboxDashboardItems(value))
}

export async function enqueueInboxCapture(
  input: { content: string; note?: string },
  fetcher: Fetcher = fetch,
): Promise<string> {
  let response: Response
  try {
    response = await fetcher("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "enqueue",
        content: input.content,
        note: input.note,
      }),
    })
  } catch {
    throw new Error("담기 네트워크 오류")
  }

  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new Error("담기 응답을 읽지 못했습니다.")
  }

  if (!response.ok || !isRecord(value) || value.ok !== true) {
    throw new Error(inboxError(value, "담기에 실패했습니다."))
  }

  const id = parseEnqueueItemId(value)
  if (!id) throw new Error("담기 응답에 항목 id가 없습니다.")
  return id
}
