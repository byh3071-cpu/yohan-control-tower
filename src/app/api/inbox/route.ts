import { NextRequest, NextResponse } from "next/server"

import {
  approveInbox,
  decideInbox,
  enqueueInbox,
  InboxInputError,
  isLocalReadRequest,
  isSameOriginRequest,
  loadInboxDashboard,
  readInboxJsonBody,
} from "@/lib/inbox-controller"
import type { InboxDecisionInput, QuickCaptureInput } from "@/lib/inbox-controller"
import type { InboxDisposition } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const SENSITIVE_ERROR_LINE = /\b(token|secret|password|passwd|pwd|api[-_ ]?key|credential|authorization|bearer)\b/i

function optionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new InboxInputError("selectedActions는 문자열 배열이어야 합니다.")
  }
  return value
}

function errorResponse(error: unknown) {
  if (error instanceof InboxInputError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  }
  const detail = (error instanceof Error ? error.message : String(error))
    .split(/\r?\n/)
    .map((line) => SENSITIVE_ERROR_LINE.test(line) ? "[민감 정보 포함 오류 줄 숨김]" : line)
    .join("\n")
    .slice(0, 2_000)
  console.error("[inbox] 내부 요청 실패:", detail)
  return NextResponse.json({ ok: false, error: "인박스 요청 처리 실패" }, { status: 500 })
}

export async function GET(request: NextRequest) {
  if (!isLocalReadRequest(request)) {
    return NextResponse.json({ ok: false, error: "로컬 조회 요청만 허용합니다." }, { status: 403 })
  }
  try {
    return NextResponse.json(await loadInboxDashboard())
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "로컬 same-origin 요청만 허용합니다." }, { status: 403 })
  }

  try {
    const body = await readInboxJsonBody(request)
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
