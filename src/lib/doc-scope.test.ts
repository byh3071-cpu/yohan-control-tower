import assert from "node:assert/strict"
import test from "node:test"

import { findRecentApprovedKnowledge } from "./doc-scope"
import type { DocMeta } from "./types"

function doc(overrides: Partial<DocMeta>): DocMeta {
  return {
    id: "doc",
    title: "문서",
    date: "2026-08-22",
    tags: [],
    related: [],
    category: "url",
    status: null,
    relPath: "ingest/url/doc.md",
    excerpt: "",
    sourceName: null,
    ...overrides,
  }
}

test("같은 날짜라도 approvedAt이 가장 늦은 승인 산출물을 선택한다", () => {
  const docs = [
    doc({ title: "최신 RESOURCE", approvedAt: "2026-08-22T12:44:42.208972+00:00", relPath: "ingest/url/knowledge-22222222-2222-2222-2222-222222222222.md" }),
    doc({ id: "knowledge-11111111-1111-1111-1111-111111111111", title: "이전 SUMMARY", category: "insights", relPath: "ingest/insights/knowledge-11111111-1111-1111-1111-111111111111.md" }),
    doc({ title: "이전 RESOURCE", approvedAt: "2026-08-22T09:00:00.000000+00:00", relPath: "ingest/url/knowledge-11111111-1111-1111-1111-111111111111.md" }),
    doc({ id: "knowledge-22222222-2222-2222-2222-222222222222", title: "최신 SUMMARY", category: "insights", relPath: "ingest/insights/knowledge-22222222-2222-2222-2222-222222222222.md" }),
  ]

  assert.deepEqual(findRecentApprovedKnowledge(docs), {
    title: "최신 SUMMARY",
    summaryRelPath: "ingest/insights/knowledge-22222222-2222-2222-2222-222222222222.md",
    artifacts: { resource: true, summary: true },
  })
})

test("SUMMARY가 없으면 최근 승인 상태에서 완료를 주장하지 않는다", () => {
  const docs = [
    doc({ title: "RESOURCE만 존재", approvedAt: "2026-08-22T12:44:42.208972+00:00", relPath: "ingest/url/knowledge-33333333-3333-3333-3333-333333333333.md" }),
  ]

  assert.deepEqual(findRecentApprovedKnowledge(docs), {
    title: "RESOURCE만 존재",
    summaryRelPath: null,
    artifacts: { resource: true, summary: false },
  })
})
