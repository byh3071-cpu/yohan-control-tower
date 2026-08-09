import { NextRequest, NextResponse } from "next/server"

import {
  isLocalReadRequest,
  isSameOriginRequest,
} from "@/lib/inbox-controller"
import {
  KnowledgeReviewInputError,
  loadKnowledgeReviews,
  parseKnowledgeReviewDecision,
  readKnowledgeReviewJsonBody,
  submitKnowledgeReview,
} from "@/lib/knowledge-review-controller"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function errorResponse(error: unknown) {
  const message = error instanceof KnowledgeReviewInputError
    ? error.message
    : "지식 검토 서비스를 사용할 수 없습니다. YOHAN_MCP_ROOT와 로컬 설정을 확인해 주세요."
  return NextResponse.json({ ok: false, error: message }, { status: error instanceof KnowledgeReviewInputError ? 400 : 503 })
}

export async function GET(request: NextRequest) {
  if (!isLocalReadRequest(request)) {
    return NextResponse.json({ ok: false, error: "로컬 same-origin 조회만 허용합니다." }, { status: 403 })
  }
  try {
    return NextResponse.json(await loadKnowledgeReviews())
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "로컬 same-origin 요청만 허용합니다." }, { status: 403 })
  }
  try {
    const input = parseKnowledgeReviewDecision(await readKnowledgeReviewJsonBody(request))
    const result = await submitKnowledgeReview(input)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    return errorResponse(error)
  }
}
