import { existsSync } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"

import { runJsonProcess } from "@/lib/inbox-controller"
import type {
  KnowledgeReviewDecision,
  KnowledgeReviewItem,
  KnowledgeReviewListResponse,
  KnowledgeReviewStatus,
} from "@/lib/types"

const REVIEW_STATUSES = new Set<KnowledgeReviewStatus>(["review_required", "completed", "held", "rejected"])
const REVIEW_DECISIONS = new Set<KnowledgeReviewDecision>(["approve", "approve_after_edit", "hold", "reject"])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
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

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new KnowledgeReviewInputError(`${field} 값이 올바르지 않습니다.`)
  }
  return value.map((entry) => entry.trim()).filter(Boolean)
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
  const claims = Array.isArray(value.claims)
    ? value.claims.map((claim) => {
      if (!isRecord(claim)) throw new KnowledgeReviewInputError("주장 형식이 올바르지 않습니다.")
      const timestamp = optionalString(claim.timestamp ?? claim.citation)
      return { claim: requiredString(claim.claim ?? claim.statement, "주장"), ...(timestamp ? { timestamp } : {}) }
    })
    : []
  const status = requiredString(value.status, "상태") as KnowledgeReviewStatus
  if (!REVIEW_STATUSES.has(status)) throw new KnowledgeReviewInputError("허용되지 않은 검토 상태입니다.")
  const id = requiredString(value.id ?? value.jobId, "항목 ID")
  if (!UUID_RE.test(id)) throw new KnowledgeReviewInputError("항목 ID가 UUID 형식이 아닙니다.")
  const originalUrl = requiredString(value.originalUrl ?? value.original_url ?? value.sourceUrl, "원본 URL")
  try {
    const parsed = new URL(originalUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported protocol")
  } catch {
    throw new KnowledgeReviewInputError("원본 URL이 올바르지 않습니다.")
  }
  const notebookId = optionalString(value.notebookId ?? value.notebook_id)
  const sourceId = optionalString(value.notebookSourceId ?? value.notebook_source_id)
  const notebookLmSource = optionalString(value.notebookLmSource ?? value.notebooklm_source)
    ?? (notebookId && sourceId ? `${notebookId} / ${sourceId}` : sourceId)
  return {
    id,
    status,
    title: optionalString(value.title) ?? "YouTube 영상",
    originalUrl,
    ...(notebookLmSource ? { notebookLmSource } : {}),
    summary: requiredString(value.summary, "요약"),
    claims,
    category: optionalString(value.category) ?? "YT · 미분류 · Inbox",
    qualityWarnings: stringArray(value.qualityWarnings ?? value.quality_warnings ?? [], "품질 경고"),
    ...(typeof value.updatedAt === "string" ? { updatedAt: value.updatedAt } : {}),
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
  else {
    args = ["approve", input.id, "--stdin"]
    stdin = JSON.stringify({ humanNote: input.note ?? "" })
  }
  const payload = await runKnowledgeCli(args, stdin, deps)
  assertCliSuccess(payload, "지식 검토 결정")
  if (payload.idempotent === true) return { status: 409, body: { ok: false, error: "이미 처리된 검토 항목입니다." } }
  return { status: 200, body: payload }
}
