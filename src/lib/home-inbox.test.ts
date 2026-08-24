import assert from "node:assert/strict"
import test from "node:test"

import {
  buildHomePeekView,
  enqueueInboxCapture,
  fetchInboxItems,
  findInboxItemById,
  inboxItemTitle,
  latestActiveInboxItem,
  looksLikeInternalPath,
  parseEnqueueItemId,
  parseInboxDashboardItems,
  parseInboxTimestamp,
  publicText,
  resolvePeekSelection,
  sortInboxItemsByRecency,
} from "./home-inbox"
import type { InboxItem } from "./types"

function item(overrides: Partial<InboxItem> & Pick<InboxItem, "id">): InboxItem {
  return {
    status: "queued",
    stage: "captured",
    disposition: null,
    platform: "local",
    capture_channel: "browser",
    content_kind: "text",
    canonical_url: null,
    envelope: {
      version: "CaptureEnvelope.v1",
      captured_at: "2026-08-22T10:00:00.000Z",
      attachments: [],
      raw_text: "원문 발췌",
    },
    triage: null,
    deep: null,
    human: null,
    promotion: null,
    attempt_count: 0,
    created_at: "2026-08-22T10:00:00.000Z",
    updated_at: "2026-08-22T10:00:00.000Z",
    ...overrides,
  }
}

test("타임스탬프는 유효 ISO만 파싱하고 잘못된 값은 null이다", () => {
  assert.equal(parseInboxTimestamp("2026-08-22T12:00:00.000Z"), Date.parse("2026-08-22T12:00:00.000Z"))
  assert.equal(parseInboxTimestamp("not-a-date"), null)
  assert.equal(parseInboxTimestamp(""), null)
  assert.equal(parseInboxTimestamp(undefined), null)
})

test("최근 활성 항목은 API 배열 순서가 아니라 updated_at/created_at으로 고른다", () => {
  const older = item({ id: "11111111-1111-4111-8111-111111111111", updated_at: "2026-08-22T09:00:00.000Z" })
  const newest = item({
    id: "22222222-2222-4222-8222-222222222222",
    created_at: "broken",
    updated_at: "2026-08-22T13:00:00.000Z",
  })
  const middle = item({
    id: "33333333-3333-4333-8333-333333333333",
    updated_at: "invalid",
    created_at: "2026-08-22T11:00:00.000Z",
  })
  const unparseable = item({
    id: "44444444-4444-4444-8444-444444444444",
    updated_at: "nope",
    created_at: "still-nope",
  })

  const sorted = sortInboxItemsByRecency([older, unparseable, newest, middle])
  assert.deepEqual(sorted.map((entry) => entry.id), [
    newest.id,
    middle.id,
    older.id,
    unparseable.id,
  ])
  assert.equal(latestActiveInboxItem([older, newest, middle])?.id, newest.id)
  assert.notEqual(latestActiveInboxItem([older, newest, middle])?.id, older.id)
})

test("enqueue 응답에서 item.id를 읽고 없으면 null이다", () => {
  assert.equal(parseEnqueueItemId({ ok: true, item: { id: "55555555-5555-4555-8555-555555555555" } }), "55555555-5555-4555-8555-555555555555")
  assert.equal(parseEnqueueItemId({ ok: true, id: "66666666-6666-4666-8666-666666666666" }), "66666666-6666-4666-8666-666666666666")
  assert.equal(parseEnqueueItemId({ ok: true, item: {} }), null)
  assert.equal(parseEnqueueItemId({ ok: false }), null)
})

test("피크 선택은 선호 id만 쓰고 items[0]으로 떨어지지 않는다", () => {
  const first = item({ id: "11111111-1111-4111-8111-111111111111", updated_at: "2026-08-22T14:00:00.000Z" })
  const captured = item({ id: "99999999-9999-4999-8999-999999999999", updated_at: "2026-08-22T10:00:00.000Z" })
  const items = [first, captured]

  assert.equal(resolvePeekSelection(items, captured.id)?.id, captured.id)
  assert.equal(findInboxItemById(items, "missing") , null)
  assert.equal(resolvePeekSelection(items, "missing"), null)
  assert.equal(resolvePeekSelection(items, null), null)
})

test("피크는 존재하는 공개 필드만 보여주고 내부 경로·hash를 숨긴다", () => {
  assert.equal(looksLikeInternalPath("C:/Users/user/brain/note.md"), true)
  assert.equal(looksLikeInternalPath("출처는 C:/Users/user/brain/note.md 입니다"), true)
  assert.equal(looksLikeInternalPath("참고: /home/user/yohan-brain/docs/note.md"), true)
  assert.equal(looksLikeInternalPath("/Users/user/yohan-brain/docs/note.md"), true)
  assert.equal(looksLikeInternalPath("ingest/insights/knowledge-1.md"), true)
  assert.equal(looksLikeInternalPath("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), true)
  assert.equal(looksLikeInternalPath("https://example.com/article"), false)
  assert.equal(publicText("memory/core/rules.md"), null)

  const peek = buildHomePeekView(item({
    id: "77777777-7777-4777-8777-777777777777",
    platform: "youtube",
    canonical_url: "https://www.youtube.com/watch?v=abc",
    envelope: {
      version: "CaptureEnvelope.v1",
      captured_at: "2026-08-22T10:00:00.000Z",
      attachments: [{ sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
      raw_text: "비교 원문입니다. 오픈소스 후보를 나란히 둡니다.",
      user_note: "C:/Users/user/secret.md",
    },
    triage: { source_summary: "ingest/url/clip.md", relevance: 0.8, recommended_disposition: "knowledge", requires_deep: true, missing_context: [] },
    deep: {
      title: "AI 모델 평가: 오픈소스 후보 비교",
      summary: "후보 모델의 평가 기준을 정리한 메모",
      key_points: ["평가 축을 먼저 고정한다", "C:/Users/user/brain/eval.md"],
      evidence: [],
      yohan_relevance: "학습",
      recommended_disposition: "knowledge",
      actions: [],
      uncertainties: ["벤치마크 재현 범위"],
    },
  }))

  assert.equal(peek.title, "AI 모델 평가: 오픈소스 후보 비교")
  assert.equal(peek.summary, "후보 모델의 평가 기준을 정리한 메모")
  assert.deepEqual(peek.keyPoints, ["평가 축을 먼저 고정한다"])
  assert.deepEqual(peek.uncertainties, ["벤치마크 재현 범위"])
  assert.equal(peek.source?.includes("YouTube"), true)
  assert.equal(JSON.stringify(peek).includes("C:/Users"), false)
  assert.equal(JSON.stringify(peek).includes("sha256"), false)
  assert.equal(JSON.stringify(peek).includes("relPath"), false)
  assert.equal(inboxItemTitle(item({
    id: "88888888-8888-4888-8888-888888888888",
    envelope: {
      version: "CaptureEnvelope.v1",
      captured_at: "2026-08-22T10:00:00.000Z",
      attachments: [],
      raw_text: "짧은 메모",
    },
  })), "짧은 메모")
})

test("대시보드 파서는 ok=false와 잘못된 items를 거절한다", () => {
  assert.deepEqual(parseInboxDashboardItems({ ok: true, items: [item({ id: "11111111-1111-4111-8111-111111111111" })] }).map((entry) => entry.id), ["11111111-1111-4111-8111-111111111111"])
  assert.throws(() => parseInboxDashboardItems({ ok: false, error: "로컬 조회 요청만 허용합니다." }), /로컬 조회/)
  assert.throws(() => parseInboxDashboardItems({ ok: true, items: "nope" }), /형식/)
})

test("enqueue 성공 후 refresh에서 같은 id를 고르고 최신 items[0]을 쓰지 않는다", async () => {
  const capturedId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const newestOther = item({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updated_at: "2026-08-22T18:00:00.000Z",
    envelope: {
      version: "CaptureEnvelope.v1",
      captured_at: "2026-08-22T18:00:00.000Z",
      attachments: [],
      raw_text: "더 최신인 다른 항목",
    },
  })
  const captured = item({
    id: capturedId,
    updated_at: "2026-08-22T12:00:00.000Z",
    envelope: {
      version: "CaptureEnvelope.v1",
      captured_at: "2026-08-22T12:00:00.000Z",
      attachments: [],
      raw_text: "방금 담은 항목",
    },
  })

  const fetcher: typeof fetch = async (input, init) => {
    if (typeof input === "string" && input.startsWith("/api/inbox") && init?.method === "POST") {
      return new Response(JSON.stringify({ ok: true, item: { id: capturedId } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
    return new Response(JSON.stringify({ ok: true, items: [newestOther, captured] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  const id = await enqueueInboxCapture({ content: "방금 담은 항목" }, fetcher)
  const items = await fetchInboxItems(fetcher)
  const selected = resolvePeekSelection(items, id)

  assert.equal(id, capturedId)
  assert.equal(items[0]?.id, newestOther.id)
  assert.equal(selected?.id, capturedId)
  assert.notEqual(selected?.id, items[0]?.id)
})

test("네트워크 mock은 실제 enqueue를 호출하지 않고 실패 응답을 그대로 드러낸다", async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({ ok: false, error: "로컬 same-origin 요청만 허용합니다." }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  })

  await assert.rejects(enqueueInboxCapture({ content: "x" }, fetcher), /same-origin/)
  await assert.rejects(fetchInboxItems(fetcher), /same-origin/)
})
