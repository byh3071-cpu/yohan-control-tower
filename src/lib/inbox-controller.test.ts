import assert from "node:assert/strict"
import { test } from "node:test"

import {
  buildHumanDecision,
  buildQuickCaptureEnvelope,
  collectPagedItems,
  InboxInputError,
  isLocalReadRequest,
  isSameOriginRequest,
  readInboxJsonBody,
  runJsonProcess,
} from "./inbox-controller.js"
import {
  CAPTURE_CONTENT_MAX_CHARS,
  CAPTURE_NOTE_MAX_CHARS,
  MAX_REQUEST_BYTES,
} from "./inbox-limits.js"

test("활성 큐를 100건 단위로 끝까지 페이지네이션한다", async () => {
  const source = Array.from({ length: 115 }, (_, index) => `item-${index + 1}`)
  const calls: Array<{ offset: number; limit: number }> = []
  const items = await collectPagedItems({
    total: source.length,
    loadPage: async (offset, limit) => {
      calls.push({ offset, limit })
      return source.slice(offset, offset + limit)
    },
  })

  assert.deepEqual(calls, [
    { offset: 0, limit: 100 },
    { offset: 100, limit: 15 },
  ])
  assert.deepEqual(items, source)
})

test("페이지 응답이 비거나 상한에 닿으면 숨기지 않고 수집을 멈춘다", async () => {
  const partial = await collectPagedItems({
    total: 150,
    loadPage: async (offset) => offset === 0 ? Array.from({ length: 40 }, (_, index) => index) : [],
  })
  assert.equal(partial.length, 40)

  const cappedCalls: Array<{ offset: number; limit: number }> = []
  const capped = await collectPagedItems({
    total: 10_001,
    pageSize: 100,
    maxItems: 150,
    loadPage: async (offset, limit) => {
      cappedCalls.push({ offset, limit })
      return Array.from({ length: 100 }, (_, index) => offset + index)
    },
  })
  assert.equal(capped.length, 150)
  assert.deepEqual(cappedCalls, [
    { offset: 0, limit: 100 },
    { offset: 100, limit: 50 },
  ])
})

test("빠른 수집 URL을 CaptureEnvelope.v1로 보존한다", () => {
  const envelope = buildQuickCaptureEnvelope({
    content: "https://x.com/example/status/123?utm_source=test",
    note: "스킬 후보인지 확인",
  })

  assert.equal(envelope.version, "CaptureEnvelope.v1")
  assert.equal(envelope.platform, "x")
  assert.equal(envelope.capture_channel, "browser")
  assert.equal(envelope.content_kind, "mixed")
  assert.equal(envelope.canonical_url, "https://x.com/example/status/123?utm_source=test")
  assert.equal(envelope.user_note, "스킬 후보인지 확인")
  assert.equal("raw_text" in envelope, false)

  const subdomain = buildQuickCaptureEnvelope({ content: "https://mobile.x.com/example/status/456" })
  assert.equal(subdomain.platform, "x")
})

test("빠른 수집 텍스트는 로컬 원문으로 보존한다", () => {
  const envelope = buildQuickCaptureEnvelope({ content: "  겹치는 프롬프트 스킬 조사  " })

  assert.equal(envelope.platform, "local")
  assert.equal(envelope.content_kind, "text")
  assert.equal(envelope.raw_text, "겹치는 프롬프트 스킬 조사")
  assert.match(String(envelope.idempotency_key), /^control-tower:/)
})

test("사람 결정은 UUID·처리 방식·행동 목록을 닫힌 값으로 검증한다", () => {
  const id = "1d26bd0b-f0e4-42d7-97c8-ffb62c7cb9f3"
  const built = buildHumanDecision({
    id,
    decision: "approve",
    disposition: "action",
    myThoughts: "직접 적용해 볼 것",
    selectedActions: ["try-it", "try-it"],
  })
  const decision = built.decision as Record<string, unknown>

  assert.equal(built.id, id)
  assert.equal(decision.version, "Human.v1")
  assert.equal(decision.disposition, "action")
  assert.deepEqual(decision.selected_actions, ["try-it"])
  assert.throws(
    () => buildHumanDecision({ id: "not-a-uuid", decision: "approve", disposition: "reference" }),
    InboxInputError
  )
  assert.throws(
    () => buildHumanDecision({ id, decision: "approve" }),
    /처리 방식/
  )
})

test("POST 신뢰 경계는 loopback의 정확히 같은 origin만 허용한다", () => {
  const same = new Request("http://localhost:3001/api/inbox", {
    headers: { origin: "http://localhost:3001" },
  })
  const loopbackIp = new Request("http://127.0.0.1:3001/api/inbox", {
    headers: { origin: "http://127.0.0.1:3001" },
  })
  const foreign = new Request("http://localhost:3001/api/inbox", {
    headers: { origin: "http://evil.example" },
  })
  const rebound = new Request("http://evil.example/api/inbox", {
    headers: { origin: "http://evil.example" },
  })
  const browserSameOrigin = new Request("http://127.0.0.1:3001/api/inbox", {
    headers: {
      host: "localhost:3001",
      referer: "http://localhost:3001/",
      "sec-fetch-site": "same-origin",
    },
  })
  const missing = new Request("http://localhost:3001/api/inbox")

  assert.equal(isSameOriginRequest(same), true)
  assert.equal(isSameOriginRequest(loopbackIp), true)
  assert.equal(isSameOriginRequest(foreign), false)
  assert.equal(isSameOriginRequest(rebound), false)
  assert.equal(isSameOriginRequest(browserSameOrigin), true)
  assert.equal(isSameOriginRequest(missing), false)
})

test("GET 신뢰 경계는 Origin 없는 로컬 조회를 허용하고 cross-site·외부 host를 거부한다", () => {
  const local = new Request("http://localhost:3001/api/inbox")
  const localSameSite = new Request("http://127.0.0.1:3001/api/inbox", {
    headers: { "sec-fetch-site": "same-origin" },
  })
  const crossSite = new Request("http://localhost:3001/api/inbox", {
    headers: { "sec-fetch-site": "cross-site" },
  })
  const foreignOrigin = new Request("http://localhost:3001/api/inbox", {
    headers: { origin: "http://evil.example" },
  })
  const rebound = new Request("http://evil.example/api/inbox")

  assert.equal(isLocalReadRequest(local), true)
  assert.equal(isLocalReadRequest(localSameSite), true)
  assert.equal(isLocalReadRequest(crossSite), false)
  assert.equal(isLocalReadRequest(foreignOrigin), false)
  assert.equal(isLocalReadRequest(rebound), false)
})

test("YOHAN_PREVIEW_HOST가 있을 때만 그 hostname의 조회·쓰기를 연다", () => {
  const previous = process.env.YOHAN_PREVIEW_HOST
  process.env.YOHAN_PREVIEW_HOST = "preview.example"
  try {
    const previewGet = new Request("http://127.0.0.1:3101/api/calendar", {
      headers: { host: "preview.example" },
    })
    const previewGetHttpsOrigin = new Request("http://preview.example/api/calendar", {
      headers: { host: "preview.example", origin: "https://preview.example" },
    })
    const previewPost = new Request("http://127.0.0.1:3101/api/calendar", {
      method: "POST",
      headers: { host: "preview.example", origin: "https://preview.example" },
    })
    const previewCrossSite = new Request("http://preview.example/api/calendar", {
      headers: { host: "preview.example", "sec-fetch-site": "cross-site" },
    })
    const previewEvilOrigin = new Request("http://preview.example/api/calendar", {
      headers: { host: "preview.example", origin: "http://evil.example" },
    })
    const otherHost = new Request("http://other.example/api/calendar", {
      headers: { host: "other.example" },
    })

    assert.equal(isLocalReadRequest(previewGet), true)
    assert.equal(isLocalReadRequest(previewGetHttpsOrigin), true)
    assert.equal(isSameOriginRequest(previewPost), true)
    assert.equal(isLocalReadRequest(previewCrossSite), false)
    assert.equal(isLocalReadRequest(previewEvilOrigin), false)
    assert.equal(isLocalReadRequest(otherHost), false)
    assert.equal(isSameOriginRequest(otherHost), false)
  } finally {
    if (previous === undefined) delete process.env.YOHAN_PREVIEW_HOST
    else process.env.YOHAN_PREVIEW_HOST = previous
  }
})

test("YOHAN_PREVIEW_HOST가 없으면 외부 host 조회는 계속 거부한다", () => {
  const previous = process.env.YOHAN_PREVIEW_HOST
  delete process.env.YOHAN_PREVIEW_HOST
  try {
    const preview = new Request("http://preview.example/api/calendar", {
      headers: { host: "preview.example" },
    })
    assert.equal(isLocalReadRequest(preview), false)
    assert.equal(isSameOriginRequest(preview), false)
  } finally {
    if (previous === undefined) delete process.env.YOHAN_PREVIEW_HOST
    else process.env.YOHAN_PREVIEW_HOST = previous
  }
})

test("한국어·이모지 100,000자 캡처 요청은 바이트 상한에 걸리지 않고 무손실 통과한다", async () => {
  // UI maxLength 가 허용하는 최대치를 그대로 재현: 한글(자당 UTF-8 3바이트) 100,000자
  const content = "가나다라마".repeat(CAPTURE_CONTENT_MAX_CHARS / 5)
  // "메모😀".length === 4 (이모지는 UTF-16 2유닛) → 노트도 상한 8,000자 꽉 채움
  const note = "메모😀".repeat(CAPTURE_NOTE_MAX_CHARS / 4)
  const raw = JSON.stringify({ action: "enqueue", content, note })
  const rawBytes = Buffer.byteLength(raw, "utf8")
  assert.ok(rawBytes > 300_000, "멀티바이트 페이로드 재현이 깨졌다 (옛 상한 120,000 회귀 감시)")
  assert.ok(rawBytes <= MAX_REQUEST_BYTES)

  const body = await readInboxJsonBody({
    headers: new Headers({
      "content-type": "application/json",
      "content-length": String(rawBytes),
    }),
    text: async () => raw,
  })
  assert.equal(body.content, content)

  const envelope = buildQuickCaptureEnvelope({ content, note })
  assert.equal(String(envelope.raw_text).length, CAPTURE_CONTENT_MAX_CHARS)
  assert.equal(envelope.user_note, note)
})

test("바이트 상한 초과는 헤더에서 조기 거절하고, 헤더가 거짓이면 실제 바이트로 재거절한다", async () => {
  const oversized = JSON.stringify({
    action: "enqueue",
    content: "가".repeat(CAPTURE_CONTENT_MAX_CHARS * 2 + 20_000),
  })
  assert.ok(Buffer.byteLength(oversized, "utf8") > MAX_REQUEST_BYTES)

  // ① content-length 헤더 조기 거절 — 본문은 읽히지 않아야 한다
  let bodyRead = false
  await assert.rejects(
    readInboxJsonBody({
      headers: new Headers({
        "content-type": "application/json",
        "content-length": String(MAX_REQUEST_BYTES + 1),
      }),
      text: async () => {
        bodyRead = true
        return oversized
      },
    }),
    InboxInputError
  )
  assert.equal(bodyRead, false)

  // ② 헤더가 없어도(또는 속여도) 실제 UTF-8 바이트 재검사로 거절
  await assert.rejects(
    readInboxJsonBody({
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => oversized,
    }),
    /너무 큽니다/
  )

  // ③ 실제 Request stream은 상한을 넘는 첫 chunk에서 취소되고 후속 chunk를 읽지 않는다
  let pulls = 0
  let cancelled = false
  const oversizedStream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1
      controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES + 1))
    },
    cancel() {
      cancelled = true
    },
  })
  await assert.rejects(
    readInboxJsonBody({
      headers: new Headers({ "content-type": "application/json" }),
      body: oversizedStream,
      text: async () => { throw new Error("stream 경로에서 text()를 호출하면 안 됩니다.") },
    }),
    /너무 큽니다/
  )
  assert.equal(pulls, 1)
  assert.equal(cancelled, true)
})

test("JSON 프로세스 실행기는 shell 없이 stdin과 JSON stdout만 전달한다", async () => {
  const result = await runJsonProcess<{ ok: boolean; text: string }>({
    executable: process.execPath,
    args: [
      "-e",
      "let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify({ok:true,text:JSON.parse(s).text})));",
    ],
    cwd: process.cwd(),
    stdin: JSON.stringify({ text: "a;$(not-executed)" }),
  })

  assert.deepEqual(result, { ok: true, text: "a;$(not-executed)" })
})

test("JSON이 아니거나 출력 상한을 넘긴 프로세스는 실패한다", async () => {
  const cwd = process.cwd()
  await assert.rejects(
    runJsonProcess({ executable: process.execPath, args: ["-e", "process.stdout.write('plain')"], cwd }),
    /JSON이 아닌/
  )
  await assert.rejects(
    runJsonProcess({
      executable: process.execPath,
      args: ["-e", "process.stdout.write('x'.repeat(256))"],
      cwd,
      maxOutputBytes: 32,
    }),
    /허용 크기/
  )
  await assert.rejects(
    runJsonProcess({
      executable: process.execPath,
      args: ["-e", "setInterval(() => {}, 1000)"],
      cwd,
      timeoutMs: 50,
    }),
    /50ms/
  )
})
