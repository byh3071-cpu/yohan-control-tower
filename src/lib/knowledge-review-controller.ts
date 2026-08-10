import { existsSync } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"

import { runJsonProcess } from "@/lib/inbox-controller"
import type {
  KnowledgeReviewDecision,
  KnowledgeReviewItem,
  KnowledgeReviewListResponse,
  KnowledgeReviewClaimType,
  KnowledgeReviewStatus,
} from "@/lib/types"

const REVIEW_STATUSES = new Set<KnowledgeReviewStatus>(["review_required", "completed", "held", "rejected"])
const REVIEW_DECISIONS = new Set<KnowledgeReviewDecision>([
  "approve",
  "approve_after_edit",
  "hold",
  "reject",
  "reprocess_required",
])
const CLAIM_TYPES = new Set<KnowledgeReviewClaimType>(["fact", "interpretation", "recommendation"])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/
export const MAX_KNOWLEDGE_REVIEW_BODY_BYTES = 16 * 1024
const MAX_REVIEW_NOTE_CHARS = 4_000

export class KnowledgeReviewInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "KnowledgeReviewInputError"
  }
}

export type KnowledgeReviewDependencies = {
  runCli?: (args: string[], stdin?: string) => Promise<unknown>
  mcpRoot?: string
  pythonExecutable?: string
}

type KnowledgeReviewJsonRequest = Pick<Request, "headers" | "text"> & {
  body?: ReadableStream<Uint8Array> | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new KnowledgeReviewInputError(`${field} 값이 올바르지 않습니다.`)
  return value.trim()
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function optionalBoundedString(value: unknown, field: string, maximum: number): string | undefined {
  const normalized = optionalString(value)
  if (normalized && normalized.length > maximum) throw new KnowledgeReviewInputError(`${field} 값이 너무 깁니다.`)
  return normalized
}

function aliasedOptionalString(record: Record<string, unknown>, fields: string[], field: string, maximum: number): string | undefined {
  const values = fields.filter((name) => Object.hasOwn(record, name)).map((name) => record[name])
  if (!values.length) return undefined
  if (values.some((value) => typeof value !== "string")) throw new KnowledgeReviewInputError(`${field} 값이 올바르지 않습니다.`)
  const normalized = values.map((value) => (value as string).trim())
  if (normalized.some((value) => value !== normalized[0])) throw new KnowledgeReviewInputError(`${field} 별칭 값이 서로 일치하지 않습니다.`)
  const value = normalized[0]
  if (!value) return undefined
  if (value.length > maximum) throw new KnowledgeReviewInputError(`${field} 값이 너무 깁니다.`)
  return value
}

function aliasedRequiredString(record: Record<string, unknown>, fields: string[], field: string, maximum: number): string {
  const value = aliasedOptionalString(record, fields, field, maximum)
  if (!value) throw new KnowledgeReviewInputError(`${field} 값이 올바르지 않습니다.`)
  return value
}

function boundedString(value: unknown, field: string, maximum: number): string {
  const normalized = requiredString(value, field)
  if (normalized.length > maximum) throw new KnowledgeReviewInputError(`${field} 값이 너무 깁니다.`)
  return normalized
}

function stringArray(value: unknown, field: string, maximumEntryLength = 4_000, maximumEntries = 64): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new KnowledgeReviewInputError(`${field} 값이 올바르지 않습니다.`)
  }
  if (value.length > maximumEntries) throw new KnowledgeReviewInputError(`${field} 항목이 너무 많습니다.`)
  return value.map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    if (entry.length > maximumEntryLength) throw new KnowledgeReviewInputError(`${field} 값이 너무 깁니다.`)
    return entry
  })
}

function aliasedStringArray(record: Record<string, unknown>, fields: string[], field: string, maximumEntryLength = 4_000, maximumEntries = 64): string[] {
  const values = fields.filter((name) => Object.hasOwn(record, name)).map((name) => record[name])
  if (!values.length) return []
  const normalized = values.map((value) => stringArray(value, field, maximumEntryLength, maximumEntries))
  if (normalized.some((value) => value.length !== normalized[0]?.length || value.some((entry, index) => entry !== normalized[0]?.[index]))) {
    throw new KnowledgeReviewInputError(`${field} 별칭 값이 서로 일치하지 않습니다.`)
  }
  return normalized[0] ?? []
}

function optionalBoolean(record: Record<string, unknown>, fields: string[], fallback: boolean, label: string): boolean {
  const values = fields.filter((field) => Object.hasOwn(record, field)).map((field) => record[field])
  if (!values.length) return fallback
  if (values.some((value) => typeof value !== "boolean")) throw new KnowledgeReviewInputError(`${label} 값이 올바르지 않습니다.`)
  if (values.some((value) => value !== values[0])) throw new KnowledgeReviewInputError(`${label} 값이 서로 일치하지 않습니다.`)
  return values[0] as boolean
}

function normalizeUncertainties(value: unknown): string[] {
  const uncertainties = stringArray(value, "불확실성", 1_500, 32)
  return uncertainties.length === 1 && /^(없음|none|n\/?a)$/i.test(uncertainties[0] ?? "") ? [] : uncertainties
}

function isValidUpdatedAt(value: string): boolean {
  return ISO_TIMESTAMP_RE.test(value) && !Number.isNaN(Date.parse(value))
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new KnowledgeReviewInputError(`${field} 값이 올바르지 않습니다.`)
  }
  return value
}

function resolveKnowledgeCliRuntime(deps: KnowledgeReviewDependencies): { executable: string; script: string; cwd: string } {
  const configured = deps.mcpRoot ?? process.env.YOHAN_MCP_ROOT?.trim()
  if (!configured) throw new Error("YOHAN_MCP_ROOT가 설정되지 않았습니다.")
  if (!isAbsolute(configured)) throw new Error("YOHAN_MCP_ROOT는 절대경로여야 합니다.")
  const cwd = resolve(configured)
  const script = join(cwd, "scripts", "knowledge.py")
  if (!existsSync(script) || !existsSync(join(cwd, "core", "knowledge.py"))) {
    throw new Error("YOHAN_MCP_ROOT에서 지식 워크플로우 CLI를 찾지 못했습니다.")
  }
  return { executable: deps.pythonExecutable ?? "python", script, cwd }
}

async function runKnowledgeCli(args: string[], stdin: string | undefined, deps: KnowledgeReviewDependencies): Promise<unknown> {
  if (deps.runCli) return deps.runCli(args, stdin)
  const runtime = resolveKnowledgeCliRuntime(deps)
  return runJsonProcess<unknown>({
    executable: runtime.executable,
    args: [runtime.script, ...args],
    cwd: runtime.cwd,
    stdin,
    timeoutMs: 30_000,
    maxOutputBytes: 4 * 1024 * 1024,
  })
}

function normalizeItem(value: unknown): KnowledgeReviewItem {
  if (!isRecord(value)) throw new KnowledgeReviewInputError("검토 항목 형식이 올바르지 않습니다.")
  if (Array.isArray(value.claims) && value.claims.length > 64) throw new KnowledgeReviewInputError("주장 항목이 너무 많습니다.")
  const claims = Array.isArray(value.claims)
    ? value.claims.map((claim) => {
      if (!isRecord(claim)) throw new KnowledgeReviewInputError("주장 형식이 올바르지 않습니다.")
      const type = boundedString(claim.type, "주장 유형", 32) as KnowledgeReviewClaimType
      if (!CLAIM_TYPES.has(type)) throw new KnowledgeReviewInputError("허용되지 않은 주장 유형입니다.")
      const timestamp = aliasedOptionalString(claim, ["timestamp", "citation"], "타임스탬프", 200)
      const evidenceQuote = aliasedOptionalString(claim, ["evidence_quote", "evidenceQuote", "caption_quote"], "근거 문구", 2_000)
      const citationVerified = optionalBoolean(claim, ["citation_verified", "citationVerified"], false, "인용 검증 여부")
      const requiresCrosscheck = optionalBoolean(claim, ["requires_crosscheck", "requiresCrosscheck"], true, "교차 검증 필요 여부")
      return {
        claim: aliasedRequiredString(claim, ["claim", "statement"], "주장", 4_000),
        type,
        ...(timestamp ? { timestamp } : {}),
        ...(evidenceQuote ? { evidenceQuote } : {}),
        citationVerified,
        requiresCrosscheck,
      }
    })
    : []
  const status = requiredString(value.status, "상태") as KnowledgeReviewStatus
  if (!REVIEW_STATUSES.has(status)) throw new KnowledgeReviewInputError("허용되지 않은 검토 상태입니다.")
  const id = aliasedRequiredString(value, ["id", "jobId"], "항목 ID", 64)
  if (!UUID_RE.test(id)) throw new KnowledgeReviewInputError("항목 ID가 UUID 형식이 아닙니다.")
  const originalUrl = aliasedRequiredString(value, ["originalUrl", "original_url", "sourceUrl"], "원본 URL", 2_048)
  try {
    const parsed = new URL(originalUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported protocol")
  } catch {
    throw new KnowledgeReviewInputError("원본 URL이 올바르지 않습니다.")
  }
  const notebookId = aliasedOptionalString(value, ["notebookId", "notebook_id"], "NotebookLM 노트북 ID", 200)
  const sourceId = aliasedOptionalString(value, ["notebookSourceId", "notebook_source_id"], "NotebookLM source ID", 200)
  // Do not forward an opaque upstream source field: the browser only receives validated IDs.
  const notebookLmSource = notebookId && sourceId ? `${notebookId} / ${sourceId}` : sourceId
  const keyPoints = aliasedStringArray(value, ["keyPoints", "key_points"], "핵심 요점", 1_500, 32)
  const uncertainties = normalizeUncertainties(value.uncertainties ?? [])
  const qualityWarnings = aliasedStringArray(value, ["qualityWarnings", "quality_warnings"], "품질 경고", 1_500, 32)
  const approvalBlockers = aliasedStringArray(value, ["approvalBlockers", "approval_blockers"], "승인 차단 사유", 1_500, 32)
  const reprocessBlockers = aliasedStringArray(value, ["reprocessBlockers", "reprocess_blockers"], "재처리 차단 사유", 1_500, 32)
  const upstreamApprovalReady = optionalBoolean(value, ["approvalReady", "approval_ready"], false, "승인 가능 여부")
  const visibleFactBlocker = !claims.some((claim) => claim.type === "fact")
    ? "표시 가능한 사실 주장이 없어 승인 상태를 확인할 수 없습니다."
    : claims.some((claim) => claim.type === "fact" && (!claim.timestamp || !claim.evidenceQuote || !claim.citationVerified || claim.requiresCrosscheck))
      ? "표시 가능한 사실 근거가 승인 계약과 일치하지 않습니다."
      : undefined
  const approvalReady = upstreamApprovalReady && !visibleFactBlocker
  const updatedAt = aliasedOptionalString(value, ["updatedAt", "updated_at"], "갱신 시각", 100)
  if (updatedAt && !isValidUpdatedAt(updatedAt)) throw new KnowledgeReviewInputError("갱신 시각이 올바르지 않습니다.")
  return {
    id,
    status,
    title: optionalBoundedString(value.title, "제목", 1_000) ?? "YouTube 영상",
    originalUrl,
    ...(notebookLmSource ? { notebookLmSource } : {}),
    summary: boundedString(value.summary, "요약", 8_000),
    keyPoints,
    claims,
    uncertainties,
    category: optionalBoundedString(value.category, "분류", 200) ?? "YT · 미분류 · Inbox",
    qualityWarnings,
    approvalReady,
    approvalBlockers: visibleFactBlocker ? [...approvalBlockers, visibleFactBlocker] : approvalBlockers,
    reprocessEligible: optionalBoolean(value, ["reprocessEligible", "reprocess_eligible"], false, "재처리 가능 여부"),
    reprocessBlockers,
    attemptCount: nonNegativeInteger(value.attemptCount ?? value.attempt_count, "처리 시도 횟수"),
    ...(updatedAt ? { updatedAt } : {}),
  }
}

function assertCliSuccess(value: unknown, label: string): asserts value is Record<string, unknown> & { ok: true } {
  if (!isRecord(value) || value.ok !== true) throw new Error(`${label} 응답 형식이 올바르지 않습니다.`)
}

async function readRequestTextWithinLimit(request: KnowledgeReviewJsonRequest): Promise<string> {
  if (!request.body) {
    const raw = await request.text()
    if (Buffer.byteLength(raw, "utf8") > MAX_KNOWLEDGE_REVIEW_BODY_BYTES) {
      throw new KnowledgeReviewInputError("검토 요청 본문이 너무 큽니다.")
    }
    return raw
  }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      totalBytes += value.byteLength
      if (totalBytes > MAX_KNOWLEDGE_REVIEW_BODY_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw new KnowledgeReviewInputError("검토 요청 본문이 너무 큽니다.")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, totalBytes).toString("utf8")
}

export async function readKnowledgeReviewJsonBody(request: KnowledgeReviewJsonRequest): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""
  if (!contentType.startsWith("application/json")) throw new KnowledgeReviewInputError("Content-Type은 application/json이어야 합니다.")
  const declared = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(declared) && declared > MAX_KNOWLEDGE_REVIEW_BODY_BYTES) {
    throw new KnowledgeReviewInputError("검토 요청 본문이 너무 큽니다.")
  }
  const raw = await readRequestTextWithinLimit(request)
  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw new KnowledgeReviewInputError("올바른 JSON 요청이 필요합니다.")
  }
}

export async function loadKnowledgeReviews(deps: KnowledgeReviewDependencies = {}): Promise<KnowledgeReviewListResponse> {
  const payload = await runKnowledgeCli(["reviews"], undefined, deps)
  assertCliSuccess(payload, "지식 검토 목록")
  if (!Array.isArray(payload.items)) throw new KnowledgeReviewInputError("검토 CLI 응답 형식이 올바르지 않습니다.")
  if (payload.items.length > 100) throw new KnowledgeReviewInputError("검토 항목이 너무 많습니다.")
  return { ok: true, items: payload.items.map(normalizeItem).filter((item) => item.status === "review_required"), source: "yohan-mcp" }
}

export function parseKnowledgeReviewDecision(value: unknown): { id: string; decision: KnowledgeReviewDecision; note?: string } {
  if (!isRecord(value)) throw new KnowledgeReviewInputError("요청 형식이 올바르지 않습니다.")
  const extra = Object.keys(value).filter((key) => !["id", "decision", "note"].includes(key))
  if (extra.length) throw new KnowledgeReviewInputError("허용되지 않은 요청 필드가 있습니다.")
  const id = requiredString(value.id, "항목 ID")
  if (!UUID_RE.test(id)) throw new KnowledgeReviewInputError("항목 ID가 UUID 형식이 아닙니다.")
  const decision = requiredString(value.decision, "결정") as KnowledgeReviewDecision
  if (!REVIEW_DECISIONS.has(decision)) throw new KnowledgeReviewInputError("허용되지 않은 검토 결정입니다.")
  const note = value.note === undefined ? undefined : requiredString(value.note, "수정 메모")
  if (note && note.length > MAX_REVIEW_NOTE_CHARS) throw new KnowledgeReviewInputError("수정 메모는 4,000자 이하여야 합니다.")
  if (decision === "approve_after_edit" && !note) throw new KnowledgeReviewInputError("메모와 함께 승인에는 승인 메모가 필요합니다.")
  if (decision === "reprocess_required" && note) throw new KnowledgeReviewInputError("재처리 전환에는 메모를 추가할 수 없습니다.")
  return { id, decision, ...(note ? { note } : {}) }
}

export async function submitKnowledgeReview(
  input: ReturnType<typeof parseKnowledgeReviewDecision>,
  deps: KnowledgeReviewDependencies = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  let args: string[]
  let stdin: string | undefined
  if (input.decision === "hold") args = ["defer", input.id]
  else if (input.decision === "reject") args = ["reject", input.id]
  else if (input.decision === "reprocess_required") args = ["invalidate-review", input.id]
  else {
    args = ["approve", input.id, "--stdin"]
    stdin = JSON.stringify({ humanNote: input.note ?? "" })
  }
  const payload = await runKnowledgeCli(args, stdin, deps)
  assertCliSuccess(payload, "지식 검토 결정")
  if (payload.idempotent === true) return { status: 409, body: { ok: false, error: "이미 처리된 검토 항목입니다." } }
  return { status: 200, body: { ok: true } }
}
