import assert from "node:assert/strict"
import test from "node:test"

import { classifyApprovalFlow, classifyReviewQueue } from "./approval-flow"

test("RESOURCE나 SUMMARY가 빠지면 경로가 있어도 완료로 판정하지 않는다", () => {
  assert.equal(classifyApprovalFlow({ resource: false, summary: false }, null), "incomplete")
  assert.equal(classifyApprovalFlow({ resource: true, summary: false }, "ingest/insights/item.md"), "incomplete")
})

test("두 산출물이 있어도 문서 연결 전에는 별도 상태로 남긴다", () => {
  assert.equal(classifyApprovalFlow({ resource: true, summary: true }, null), "unlinked")
})

test("두 산출물과 실제 SUMMARY 경로가 모두 있어야 완료다", () => {
  assert.equal(classifyApprovalFlow({ resource: true, summary: true }, "ingest/insights/item.md"), "complete")
})

test("검토 목록 조회 실패를 모든 검토 완료로 해석하지 않는다", () => {
  assert.equal(classifyReviewQueue(false, null), "unavailable")
  assert.equal(classifyReviewQueue(true, "next-id"), "next")
  assert.equal(classifyReviewQueue(true, null), "complete")
})
