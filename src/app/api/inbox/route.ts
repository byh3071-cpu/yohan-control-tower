import { NextRequest, NextResponse } from "next/server"

import {
  approveInbox,
  decideInbox,
  enqueueInbox,
  InboxInputError,
  isSameOriginRequest,
  loadInboxDashboard,
} from "@/lib/inbox-controller"
import type { InboxDecisionInput, QuickCaptureInput } from "@/lib/inbox-controller"
import type { InboxDisposition } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_REQUEST_BYTES = 120_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
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

function optionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new InboxInputError("selectedActions는 문자열 배열이어야 합니다.")
  }
  return value
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "인박스 요청 처리 실패"
  const status = error instanceof InboxInputError ? 400 : 500
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function GET() {
  try {
    return NextResponse.json(await loadInboxDashboard())
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "same-origin 요청만 허용합니다." }, { status: 403 })
  }

  try {
    const body = await readJsonBody(request)
    const action = body.action

    if (action === "enqueue") {
      const input: QuickCaptureInput = {
        content: typeof body.content === "string" ? body.content : "",
        note: typeof body.note === "string" ? body.note : undefined,
      }
      return NextResponse.json(await enqueueInbox(input))
    }

    if (action === "decide") {
      const input: InboxDecisionInput = {
        id: typeof body.id === "string" ? body.id : "",
        decision: body.decision as InboxDecisionInput["decision"],
        disposition: body.disposition as InboxDisposition | undefined,
        myThoughts: typeof body.myThoughts === "string" ? body.myThoughts : undefined,
        selectedActions: optionalStringArray(body.selectedActions),
      }
      return NextResponse.json(await decideInbox(input))
    }

    if (action === "approve") {
      return NextResponse.json(await approveInbox(body.id))
    }

    throw new InboxInputError("지원하지 않는 인박스 action입니다.")
  } catch (error) {
    return errorResponse(error)
  }
}
