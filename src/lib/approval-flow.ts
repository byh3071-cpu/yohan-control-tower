import type { KnowledgeReviewDecisionReceipt } from "./types"

export type ApprovalFlowStatus = "complete" | "unlinked" | "incomplete"
export type ReviewQueueStatus = "unavailable" | "next" | "complete"

/** 승인 자체와 산출물 생성·화면 연결을 구분해 완료 상태의 과장을 막습니다. */
export function classifyApprovalFlow(
  artifacts: KnowledgeReviewDecisionReceipt["artifacts"],
  summaryRelPath: string | null,
): ApprovalFlowStatus {
  if (!artifacts.resource || !artifacts.summary) return "incomplete"
  return summaryRelPath ? "complete" : "unlinked"
}

/** 목록 조회 실패와 실제 빈 목록을 분리해 완료 상태의 과장을 막습니다. */
export function classifyReviewQueue(queueResolved: boolean, nextItemId: string | null): ReviewQueueStatus {
  if (!queueResolved) return "unavailable"
  return nextItemId ? "next" : "complete"
}
