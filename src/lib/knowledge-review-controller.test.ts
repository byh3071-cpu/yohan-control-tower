import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  KnowledgeReviewInputError,
  loadKnowledgeReviews,
  parseKnowledgeReviewDecision,
  readKnowledgeReviewJsonBody,
  submitKnowledgeReview,
} from "./knowledge-review-controller.js"
import { isLocalReadRequest, isSameOriginRequest } from "./inbox-controller.js"

const JOB_ID = "11111111-1111-4111-8111-111111111111"
const item = {
  jobId: JOB_ID, status: "review_required", title: "테스트 자료", sourceUrl: "https://example.com/video",
  notebookId: "nb1", notebookSourceId: "source-1", summary: "요약", claims: [{ statement: "주장", citation: "01:02" }],
  category: "기술", qualityWarnings: ["근거 확인 필요"],
}

test("Control Tower dev/start scripts bind only to IPv4 loopback", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { scripts?: Record<string, string> }
  assert.match(packageJson.scripts?.dev ?? "", /(?:^|\s)-H\s+127\.0\.0\.1(?:\s|$)/)
  assert.match(packageJson.scripts?.start ?? "", /(?:^|\s)-H\s+127\.0\.0\.1(?:\s|$)/)
})

test("yohan-mcp 검토 목록은 review_required 항목만 정규화한다", async () => {
  const result = await loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [item, { ...item, jobId: "22222222-2222-4222-8222-222222222222", status: "completed" }] }) })
  assert.equal(result.source, "yohan-mcp")
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0]?.notebookLmSource, "nb1 / source-1")
  assert.deepEqual(result.items[0]?.claims, [{ claim: "주장", timestamp: "01:02" }])
})

test("검토 결정은 UUID·enum allowlist와 메모 길이를 검증한다", () => {
  assert.deepEqual(parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve_after_edit", note: "표현 수정" }), { id: JOB_ID, decision: "approve_after_edit", note: "표현 수정" })
  assert.throws(() => parseKnowledgeReviewDecision({ id: JOB_ID, decision: "publish" }), KnowledgeReviewInputError)
  assert.throws(() => parseKnowledgeReviewDecision({ id: "not-a-uuid", decision: "approve" }), KnowledgeReviewInputError)
  assert.throws(() => parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve_after_edit" }), KnowledgeReviewInputError)
  assert.throws(() => parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve", note: "가".repeat(4_001) }), KnowledgeReviewInputError)
})

test("완료 항목 재승인은 409을 보존하고 메모는 stdin으로만 전달한다", async () => {
  const idempotent = await submitKnowledgeReview(parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve" }), { runCli: async () => ({ ok: true, idempotent: true }) })
  assert.equal(idempotent.status, 409)
  let observedArgs: string[] = []
  let observedStdin = ""
  await submitKnowledgeReview(parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve_after_edit", note: "표현 수정" }), { runCli: async (args, stdin) => { observedArgs = args; observedStdin = stdin ?? ""; return { ok: true } } })
  assert.deepEqual(observedArgs, ["approve", JOB_ID, "--stdin"])
  assert.deepEqual(JSON.parse(observedStdin), { humanNote: "표현 수정" })
})

test("검토 요청은 JSON content-type과 16KiB 본문 상한을 적용한다", async () => {
  await assert.rejects(readKnowledgeReviewJsonBody(new Request("http://localhost", { method: "POST", body: "plain" })), KnowledgeReviewInputError)
  await assert.rejects(readKnowledgeReviewJsonBody(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: "가".repeat(17_000) }) })), KnowledgeReviewInputError)
})

test("검토 API는 기존의 loopback same-origin 경계를 재사용한다", () => {
  assert.equal(isSameOriginRequest(new Request("http://localhost:3001/api/knowledge-review", { headers: { origin: "http://localhost:3001" } })), true)
  assert.equal(isSameOriginRequest(new Request("http://localhost:3001/api/knowledge-review", { headers: { origin: "http://evil.example" } })), false)
  assert.equal(isLocalReadRequest(new Request("http://localhost:3001/api/knowledge-review", { headers: { "sec-fetch-site": "cross-site" } })), false)
})
