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
  notebookId: "nb1", notebookSourceId: "source-1", notebookLmSource: "원문 전체는 브라우저로 보내면 안 됩니다.", summary: "요약",
  keyPoints: ["핵심 1", "핵심 2", "핵심 3"], uncertainties: ["추가 확인 필요"],
  claims: [{ type: "fact", statement: "주장", citation: "01:02", evidence_quote: "원문 근거", citation_verified: true, requires_crosscheck: false }],
  category: "기술", qualityWarnings: ["근거 확인 필요"], approvalReady: false,
  approvalBlockers: ["사실 주장 타임스탬프가 없습니다."], reprocessEligible: true,
  reprocessBlockers: [], attemptCount: 1,
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
  assert.deepEqual(result.items[0]?.keyPoints, ["핵심 1", "핵심 2", "핵심 3"])
  assert.deepEqual(result.items[0]?.uncertainties, ["추가 확인 필요"])
  assert.deepEqual(result.items[0]?.claims, [{ claim: "주장", type: "fact", timestamp: "01:02", evidenceQuote: "원문 근거", citationVerified: true, requiresCrosscheck: false }])
  assert.equal(result.items[0]?.approvalReady, false)
  assert.equal(result.items[0]?.reprocessEligible, true)
  assert.equal(result.items[0]?.attemptCount, 1)
})

test("주장 allowlist는 알 수 없는 type과 boolean 위조를 fail-closed로 거절한다", async () => {
  await assert.rejects(
    loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, claims: [{ ...item.claims[0], type: "opinion" }] }] }) }),
    KnowledgeReviewInputError,
  )
  await assert.rejects(
    loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, claims: [{ ...item.claims[0], citation_verified: "true" }] }] }) }),
    KnowledgeReviewInputError,
  )
})

test("누락된 claim boolean은 보수적으로 미검증·교차 검증 필요로 표시한다", async () => {
  const result = await loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, claims: [{ type: "interpretation", statement: "해석" }] }] }) })
  assert.deepEqual(result.items[0]?.claims, [{ claim: "해석", type: "interpretation", citationVerified: false, requiresCrosscheck: true }])
})

test("문자열 별칭은 trim-normalized equality만 허용하고 충돌은 fail-closed로 거절한다", async () => {
  const result = await loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{
    ...item,
    id: ` ${JOB_ID} `,
    originalUrl: " https://example.com/video ",
    notebook_id: " nb1 ",
    notebook_source_id: " source-1 ",
    claims: [{ ...item.claims[0], claim: " 주장 ", timestamp: " 01:02 ", evidenceQuote: " 원문 근거 ", caption_quote: "원문 근거" }],
  }] }) })
  assert.equal(result.items[0]?.id, JOB_ID)
  assert.equal(result.items[0]?.originalUrl, "https://example.com/video")
  await assert.rejects(
    loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, id: JOB_ID, jobId: "22222222-2222-4222-8222-222222222222" }] }) }),
    KnowledgeReviewInputError,
  )
  await assert.rejects(
    loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, originalUrl: "https://example.com/other" }] }) }),
    KnowledgeReviewInputError,
  )
  await assert.rejects(
    loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, claims: [{ ...item.claims[0], timestamp: "01:02", citation: "01:03" }] }] }) }),
    KnowledgeReviewInputError,
  )
})

test("브라우저에 보이는 사실 근거가 승인 계약과 모순되면 승인 상태를 낮춘다", async () => {
  const result = await loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{
    ...item,
    approvalReady: true,
    approvalBlockers: [],
    claims: [{ type: "interpretation", statement: "근거 없는 해석" }],
  }] }) })
  assert.equal(result.items[0]?.approvalReady, false)
  assert.match(result.items[0]?.approvalBlockers.join(" ") ?? "", /사실 주장/)
})

test("목록·주장·URL·갱신 시각 상한을 적용하고 불확실성 sentinel은 표시하지 않는다", async () => {
  await assert.rejects(
    loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: Array.from({ length: 101 }, () => item) }) }),
    KnowledgeReviewInputError,
  )
  await assert.rejects(
    loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, sourceUrl: `https://example.com/${"x".repeat(2_100)}` }] }) }),
    KnowledgeReviewInputError,
  )
  await assert.rejects(
    loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, claims: Array.from({ length: 65 }, () => item.claims[0]) }] }) }),
    KnowledgeReviewInputError,
  )
  await assert.rejects(
    loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, updatedAt: "not-a-timestamp" }] }) }),
    KnowledgeReviewInputError,
  )
  const result = await loadKnowledgeReviews({ runCli: async () => ({ ok: true, items: [{ ...item, uncertainties: ["N/A"], updatedAt: "2026-08-10T12:34:56Z" }] }) })
  assert.deepEqual(result.items[0]?.uncertainties, [])
  assert.equal(result.items[0]?.updatedAt, "2026-08-10T12:34:56Z")
})

test("검토 결정은 UUID·enum allowlist와 메모 길이를 검증한다", () => {
  assert.deepEqual(parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve_after_edit", note: "표현 수정" }), { id: JOB_ID, decision: "approve_after_edit", note: "표현 수정" })
  assert.deepEqual(parseKnowledgeReviewDecision({ id: JOB_ID, decision: "reprocess_required" }), { id: JOB_ID, decision: "reprocess_required" })
  assert.throws(() => parseKnowledgeReviewDecision({ id: JOB_ID, decision: "publish" }), KnowledgeReviewInputError)
  assert.throws(() => parseKnowledgeReviewDecision({ id: "not-a-uuid", decision: "approve" }), KnowledgeReviewInputError)
  assert.throws(() => parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve_after_edit" }), KnowledgeReviewInputError)
  assert.throws(() => parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve", note: "가".repeat(4_001) }), KnowledgeReviewInputError)
  assert.throws(() => parseKnowledgeReviewDecision({ id: JOB_ID, decision: "reprocess_required", note: "임의 사유" }), KnowledgeReviewInputError)
})

test("근거가 불완전한 레거시 검토는 고정 invalidate-review 명령만 호출한다", async () => {
  let observedArgs: string[] = []
  let observedStdin: string | undefined
  const result = await submitKnowledgeReview(
    parseKnowledgeReviewDecision({ id: JOB_ID, decision: "reprocess_required" }),
    { runCli: async (args, stdin) => { observedArgs = args; observedStdin = stdin; return { ok: true, status: "action_required" } } },
  )
  assert.equal(result.status, 200)
  assert.deepEqual(observedArgs, ["invalidate-review", JOB_ID])
  assert.equal(observedStdin, undefined)
})

test("완료 항목 재승인은 409을 보존하고 메모는 stdin으로만 전달한다", async () => {
  const idempotent = await submitKnowledgeReview(parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve" }), { runCli: async () => ({ ok: true, idempotent: true }) })
  assert.equal(idempotent.status, 409)
  let observedArgs: string[] = []
  let observedStdin = ""
  const success = await submitKnowledgeReview(parseKnowledgeReviewDecision({ id: JOB_ID, decision: "approve_after_edit", note: "표현 수정" }), { runCli: async (args, stdin) => { observedArgs = args; observedStdin = stdin ?? ""; return { ok: true, resource_path: "private/resource.md", insight_path: "private/summary.md" } } })
  assert.deepEqual(observedArgs, ["approve", JOB_ID, "--stdin"])
  assert.deepEqual(JSON.parse(observedStdin), { humanNote: "표현 수정" })
  assert.deepEqual(success.body, { ok: true })
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
