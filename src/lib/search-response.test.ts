import assert from "node:assert/strict"
import test from "node:test"

import { parseSearchClientResponse } from "./search-response.js"
import type { DocMeta } from "./types.js"

const resultDoc: DocMeta = {
  id: "doc-0",
  title: "검색 경계",
  date: "2026-08-26",
  tags: ["검색"],
  related: [],
  category: "wiki",
  status: null,
  relPath: "wiki/search-boundary.md",
  excerpt: "검색 실패와 정상 0건을 구분한다.",
  sourceName: null,
}

test("정상 AI 빈 배열은 오류가 아니라 결과 0건으로 파싱한다", () => {
  assert.deepEqual(
    parseSearchClientResponse(true, 200, { results: [], method: "ai" }),
    { ok: true, value: { results: [], method: "ai" } },
  )
})

test("API 실패는 정상 AI 0건과 다른 안전한 오류 상태로 파싱한다", () => {
  const parsed = parseSearchClientResponse(false, 502, {
    ok: false,
    code: "AI_RESPONSE_INVALID",
    error: "raw-private-value C:\\Users\\private\\brain",
    results: [],
    method: "ai",
  })

  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.equal(parsed.error, "AI 검색 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.")
  assert.doesNotMatch(parsed.error, /raw-private-value|Users|private/)
  assert.notEqual(parsed.error, "AI 검색 결과 없음")
})

test("알 수 없는 실패와 malformed 200 응답도 안전한 오류 문구로 fail-closed 처리한다", () => {
  const upstreamFailure = parseSearchClientResponse(false, 503, { error: "private raw body" })
  assert.deepEqual(upstreamFailure, { ok: false, error: "검색에 실패했습니다. 잠시 후 다시 시도해 주세요. (503)" })

  const malformedSuccess = parseSearchClientResponse(true, 200, { results: "not-an-array", method: "ai" })
  assert.deepEqual(malformedSuccess, { ok: false, error: "검색 응답 형식이 올바르지 않습니다." })
})

test("성공 응답은 method allowlist와 DocMeta 구조를 검증한다", () => {
  assert.deepEqual(
    parseSearchClientResponse(true, 200, { results: [resultDoc], method: "keyword-fallback" }),
    { ok: true, value: { results: [resultDoc], method: "keyword-fallback" } },
  )
  assert.deepEqual(
    parseSearchClientResponse(true, 200, { results: [resultDoc], method: "other" }),
    { ok: false, error: "검색 응답 형식이 올바르지 않습니다." },
  )
  assert.deepEqual(
    parseSearchClientResponse(true, 200, { results: [{ title: "불완전" }], method: "ai" }),
    { ok: false, error: "검색 응답 형식이 올바르지 않습니다." },
  )
})
