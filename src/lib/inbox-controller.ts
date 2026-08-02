import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { join } from "node:path"

import {
  CAPTURE_CONTENT_MAX_CHARS,
  CAPTURE_NOTE_MAX_CHARS,
  MAX_REQUEST_BYTES,
} from "@/lib/inbox-limits"
import { resolveRepoRoot } from "@/lib/paths"
import type {
  InboxCounts,
  InboxDashboardResponse,
  InboxDisposition,
  InboxItem,
  InboxStageCounts,
} from "@/lib/types"

const CLI_TIMEOUT_MS = 30_000
const CLI_OUTPUT_MAX_BYTES = 4 * 1024 * 1024
const INBOX_PAGE_SIZE = 100
const INBOX_ACTIVE_LOAD_MAX = 10_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"])

export const INBOX_DISPOSITIONS = [
  "knowledge",
  "skill",
  "action",
  "reference",
  "duplicate",
  "reject",
  "unrecoverable",
] as const satisfies readonly InboxDisposition[]

const INBOX_DISPOSITION_SET = new Set<string>(INBOX_DISPOSITIONS)

export type InboxCliRuntime = {
  executable: string
  argsPrefix: string[]
  cwd: string
}

export type QuickCaptureInput = {
  content: string
  note?: string
}

export type InboxDecisionInput = {
  id: string
  decision: "approve" | "reject" | "defer"
  disposition?: InboxDisposition
  myThoughts?: string
  selectedActions?: string[]
}

export class InboxInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InboxInputError"
  }
}

type StatusCliResponse = {
  ok: true
  status: InboxCounts
  stage: InboxStageCounts
  active: { total: number; by_status: InboxCounts }
}

type ListCliResponse = {
  ok: true
  items: InboxItem[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function assertCliSuccess(value: unknown, label: string): asserts value is Record<string, unknown> & { ok: true } {
  if (!isRecord(value) || value.ok !== true) {
    throw new Error(`${label} 응답 형식이 올바르지 않습니다.`)
  }
}

function normalizeRequiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") throw new InboxInputError(`${label}은 문자열이어야 합니다.`)
  const normalized = value.trim()
  if (!normalized) throw new InboxInputError(`${label}을 입력하세요.`)
  if (normalized.length > maxLength) throw new InboxInputError(`${label}은 ${maxLength}자 이하여야 합니다.`)
  return normalized
}

function normalizeOptionalText(value: unknown, label: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined
  return normalizeRequiredText(value, label, maxLength)
}

export function assertInboxItemId(value: unknown): string {
  const id = normalizeRequiredText(value, "항목 ID", 64)
  if (!UUID_RE.test(id)) throw new InboxInputError("항목 ID가 UUID 형식이 아닙니다.")
  return id
}

function canonicalHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url
  } catch {
    return null
  }
}

function platformFromUrl(url: URL): string {
  const host = url.hostname.toLowerCase()
  if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) return "youtube"
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram"
  if (host === "threads.net" || host.endsWith(".threads.net")) return "threads"
  if (host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com")) return "x"
  if (host === "github.com" || host.endsWith(".github.com")) return "github"
  if (host === "notion.so" || host.endsWith(".notion.so") || host.endsWith(".notion.site")) return "notion"
  if (host === "t.me" || host === "telegram.org" || host.endsWith(".telegram.org")) return "telegram"
  return "web"
}

export function buildQuickCaptureEnvelope(input: QuickCaptureInput): Record<string, unknown> {
  const content = normalizeRequiredText(input.content, "링크 또는 텍스트", CAPTURE_CONTENT_MAX_CHARS)
  const note = normalizeOptionalText(input.note, "메모", CAPTURE_NOTE_MAX_CHARS)
  const url = canonicalHttpUrl(content)

  return {
    version: "CaptureEnvelope.v1",
    id: randomUUID(),
    idempotency_key: `control-tower:${randomUUID()}`,
    platform: url ? platformFromUrl(url) : "local",
    capture_channel: "browser",
    content_kind: url ? (note ? "mixed" : "url") : note ? "mixed" : "text",
    captured_at: new Date().toISOString(),
    ...(url ? { canonical_url: url.toString() } : { raw_text: content }),
    ...(note ? { user_note: note } : {}),
    attachments: [],
    metadata: { source: "yohan-control-tower" },
  }
}

export function buildHumanDecision(input: InboxDecisionInput): Record<string, unknown> {
  const id = assertInboxItemId(input.id)
  if (!(["approve", "reject", "defer"] as const).includes(input.decision)) {
    throw new InboxInputError("지원하지 않는 사람 결정입니다.")
  }

  let disposition: InboxDisposition | undefined
  if (input.disposition !== undefined) {
    if (!INBOX_DISPOSITION_SET.has(input.disposition)) throw new InboxInputError("지원하지 않는 처리 방식입니다.")
    disposition = input.disposition
  }
  if (input.decision === "approve" && !disposition) {
    throw new InboxInputError("승인 결정에는 처리 방식이 필요합니다.")
  }
  if (input.decision === "reject" && disposition && disposition !== "reject") {
    throw new InboxInputError("거절 결정의 처리 방식은 reject만 허용합니다.")
  }

  const thoughts = normalizeOptionalText(input.myThoughts, "내 생각", CAPTURE_NOTE_MAX_CHARS)
  const selected = input.selectedActions ?? []
  if (!Array.isArray(selected) || selected.length > 24) {
    throw new InboxInputError("선택 행동은 최대 24개까지 허용합니다.")
  }
  const selectedActions = [...new Set(selected.map((value) => normalizeRequiredText(value, "행동 ID", 80)))]

  return {
    id,
    decision: {
      version: "Human.v1",
      decision: input.decision,
      ...(disposition ? { disposition } : {}),
      ...(thoughts ? { my_thoughts: thoughts } : {}),
      selected_actions: selectedActions,
      decided_at: new Date().toISOString(),
      decided_by: "yohan-control-tower",
    },
  }
}

/** NextRequest 가 구조적으로 만족하는 최소 표면 — 테스트에서 mock 으로 대체 가능. */
type InboxJsonRequest = Pick<Request, "headers" | "text">

/**
 * 인박스 POST 본문 파서. 상한 검사는 2단이다:
 * ① content-length 헤더 조기 거절 — 본문을 읽기 전에 끊는다(자원 절약).
 * ② 실제 UTF-8 바이트 재검사 — 헤더는 클라이언트가 속일 수 있으므로 믿지 않는다.
 */
export async function readInboxJsonBody(request: InboxJsonRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new InboxInputError("Content-Type은 application/json이어야 합니다.")
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new InboxInputError("요청 본문이 너무 큽니다.")
  }
  const raw = await request.text()
  if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) {
    throw new InboxInputError("요청 본문이 너무 큽니다.")
  }
  let body: unknown
  try {
    body = JSON.parse(raw) as unknown
  } catch {
    throw new InboxInputError("올바른 JSON 본문이 필요합니다.")
  }
  if (!isRecord(body)) throw new InboxInputError("JSON 객체가 필요합니다.")
  return body
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    const requestUrl = new URL(request.url)
    return LOOPBACK_HOSTNAMES.has(requestUrl.hostname)
      && new URL(origin).origin === requestUrl.origin
  } catch {
    return false
  }
}

export function resolveInboxCliRuntime(): InboxCliRuntime {
  const cwd = resolveRepoRoot()
  const tsxCli = join(cwd, "node_modules", "tsx", "dist", "cli.mjs")
  const inboxCli = join(cwd, "src", "yohan-inbox-cli.ts")
  if (!existsSync(tsxCli)) {
    throw new Error("yohan-brain의 tsx 실행기를 찾을 수 없습니다. brain에서 npm install을 확인하세요.")
  }
  if (!existsSync(inboxCli)) {
    throw new Error("yohan-brain 인박스 CLI를 찾을 수 없습니다. 인박스 코어 반영 상태를 확인하세요.")
  }
  return { executable: process.execPath, argsPrefix: [tsxCli, inboxCli], cwd }
}

export async function runJsonProcess<T>(spec: {
  executable: string
  args: string[]
  cwd: string
  stdin?: string
  timeoutMs?: number
  maxOutputBytes?: number
}): Promise<T> {
  const timeoutMs = spec.timeoutMs ?? CLI_TIMEOUT_MS
  const maxOutputBytes = spec.maxOutputBytes ?? CLI_OUTPUT_MAX_BYTES

  return new Promise<T>((resolve, reject) => {
    const child = spawn(spec.executable, spec.args, {
      cwd: spec.cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    let settled = false

    const finishError = (error: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (!child.killed) child.kill()
      reject(error)
    }

    const timer = setTimeout(() => {
      finishError(new Error(`인박스 CLI가 ${timeoutMs}ms 안에 끝나지 않았습니다.`))
    }, timeoutMs)

    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
      if (Buffer.byteLength(stdout, "utf8") > maxOutputBytes) {
        finishError(new Error("인박스 CLI stdout이 허용 크기를 넘었습니다."))
      }
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
      if (Buffer.byteLength(stderr, "utf8") > maxOutputBytes) {
        finishError(new Error("인박스 CLI stderr가 허용 크기를 넘었습니다."))
      }
    })
    child.on("error", (error) => finishError(error))
    child.on("close", (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code !== 0) {
        const detail = stderr.trim().slice(-2_000) || `exit code ${code ?? "unknown"}`
        reject(new Error(`인박스 CLI 실패: ${detail}`))
        return
      }
      try {
        resolve(JSON.parse(stdout) as T)
      } catch {
        reject(new Error("인박스 CLI가 JSON이 아닌 응답을 반환했습니다."))
      }
    })

    child.stdin.on("error", (error) => finishError(error))
    child.stdin.end(spec.stdin)
  })
}

async function runInboxCli<T>(args: string[], stdin?: unknown): Promise<T> {
  const runtime = resolveInboxCliRuntime()
  return runJsonProcess<T>({
    executable: runtime.executable,
    args: [...runtime.argsPrefix, ...args],
    cwd: runtime.cwd,
    ...(stdin === undefined ? {} : { stdin: JSON.stringify(stdin) }),
  })
}

export async function collectPagedItems<T>(input: {
  total: number
  loadPage: (offset: number, limit: number) => Promise<T[]>
  pageSize?: number
  maxItems?: number
}): Promise<T[]> {
  if (!Number.isInteger(input.total) || input.total < 0) {
    throw new Error("인박스 활성 건수가 올바르지 않습니다.")
  }
  const pageSize = input.pageSize ?? INBOX_PAGE_SIZE
  const maxItems = input.maxItems ?? INBOX_ACTIVE_LOAD_MAX
  if (!Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(maxItems) || maxItems < 1) {
    throw new Error("인박스 페이지 설정이 올바르지 않습니다.")
  }

  const target = Math.min(input.total, maxItems)
  const items: T[] = []
  while (items.length < target) {
    const page = await input.loadPage(items.length, pageSize)
    if (page.length > pageSize) {
      throw new Error("인박스 페이지가 요청한 크기를 초과했습니다.")
    }
    items.push(...page)
    if (page.length < pageSize) break
  }
  return items
}

export async function loadInboxDashboard(): Promise<InboxDashboardResponse> {
  // 각 CLI 프로세스가 SQLite 초기화/PRAGMA를 수행하므로 첫 연결을 병렬로 열지 않는다.
  const statusRaw = await runInboxCli<unknown>(["status"])
  assertCliSuccess(statusRaw, "status")
  if (!isRecord(statusRaw.status) || !isRecord(statusRaw.stage) || !isRecord(statusRaw.active)) {
    throw new Error("인박스 대시보드 응답 형식이 올바르지 않습니다.")
  }

  const status = statusRaw as unknown as StatusCliResponse
  const items = await collectPagedItems<InboxItem>({
    total: status.active.total,
    loadPage: async (offset, limit) => {
      const listRaw = await runInboxCli<unknown>([
        "list",
        "--active",
        "--limit",
        String(limit),
        "--offset",
        String(offset),
      ])
      assertCliSuccess(listRaw, "list")
      if (!Array.isArray(listRaw.items)) {
        throw new Error("인박스 목록 응답 형식이 올바르지 않습니다.")
      }
      return (listRaw as unknown as ListCliResponse).items
    },
  })

  return {
    ok: true,
    status: status.status,
    stage: status.stage,
    active: status.active,
    items,
    generatedAt: new Date().toISOString(),
  }
}

export async function enqueueInbox(input: QuickCaptureInput): Promise<Record<string, unknown>> {
  const result = await runInboxCli<unknown>(["enqueue", "--stdin"], buildQuickCaptureEnvelope(input))
  assertCliSuccess(result, "enqueue")
  return result
}

export async function decideInbox(input: InboxDecisionInput): Promise<Record<string, unknown>> {
  const built = buildHumanDecision(input)
  const result = await runInboxCli<unknown>(["decide", "--id", String(built.id), "--stdin"], built.decision)
  assertCliSuccess(result, "decide")
  return result
}

export async function approveInbox(idInput: unknown): Promise<Record<string, unknown>> {
  const id = assertInboxItemId(idInput)
  const result = await runInboxCli<unknown>([
    "approve",
    "--id",
    id,
    "--approve",
    "--by",
    "yohan-control-tower",
  ])
  assertCliSuccess(result, "approve")
  return result
}
