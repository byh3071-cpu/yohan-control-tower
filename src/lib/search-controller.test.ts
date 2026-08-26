import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { createSearchHandler, type SearchHandlerDependencies } from "./search-controller.js"
import type { DocMeta } from "./types.js"

const SEARCH_URL = "http://localhost:3001/api/search"
const INVALID_AI_ERROR = "AI 검색 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요."

function doc(index: number, overrides: Partial<DocMeta> = {}): DocMeta {
  return {
    id: `doc-${index}`,
    title: `문서 ${index}`,
    date: "2026-08-26",
    tags: [`태그-${index}`],
    related: [],
    category: "wiki",
    status: null,
    relPath: `wiki/doc-${index}.md`,
    excerpt: `본문 ${index}`,
    sourceName: null,
    ...overrides,
  }
}

function request(body: string | Record<string, unknown>): Request {
  return new Request(SEARCH_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

function upstream(content: unknown, status = 200): Response {
  return Response.json({ choices: [{ message: { content } }] }, { status })
}

function dependencies(options: {
  docs?: DocMeta[]
  key?: string
  response?: Response
  fetchError?: Error
} = {}) {
  let docsCalls = 0
  let keyCalls = 0
  let fetchCalls = 0
  const deps: SearchHandlerDependencies = {
    listDocs: async () => {
      docsCalls += 1
      return options.docs ?? [doc(0), doc(1), doc(2), doc(3), doc(4), doc(5)]
    },
    getApiKey: () => {
      keyCalls += 1
      return options.key
    },
    fetchUpstream: async () => {
      fetchCalls += 1
      if (options.fetchError) throw options.fetchError
      return options.response ?? upstream("[]")
    },
  }
  return { deps, calls: () => ({ docsCalls, keyCalls, fetchCalls }) }
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>
}

test("malformed JSON은 명시적 400이고 잘못된 query는 기존 400을 보존한다", async () => {
  const fake = dependencies({ key: "unused" })
  const handler = createSearchHandler(fake.deps)

  const malformed = await handler(request("{"))
  assert.equal(malformed.status, 400)
  assert.deepEqual(await json(malformed), { error: "query required" })

  for (const body of [{}, { query: "" }, { query: 3 }, { query: null }]) {
    const response = await handler(request(body))
    assert.equal(response.status, 400)
    assert.deepEqual(await json(response), { error: "query required" })
  }
  assert.deepEqual(fake.calls(), { docsCalls: 0, keyCalls: 0, fetchCalls: 0 })
})

test("키가 없으면 기존 keyword 검색을 보존하고 upstream을 호출하지 않는다", async () => {
  const docs = [
    doc(0, { title: "검색 경계" }),
    doc(1, { excerpt: "검색 경계 본문" }),
    doc(2, { tags: ["검색"] }),
    doc(3, { title: "무관" }),
  ]
  const fake = dependencies({ docs, key: "   " })

  const response = await createSearchHandler(fake.deps)(request({ query: "검색" }))

  assert.equal(response.status, 200)
  const body = await json(response)
  assert.equal(body.method, "keyword")
  assert.deepEqual(body.results, docs.slice(0, 3))
  assert.deepEqual(fake.calls(), { docsCalls: 1, keyCalls: 1, fetchCalls: 0 })
})

test("upstream HTTP non-ok이면 기존 keyword-fallback 성공 동작을 보존한다", async () => {
  const docs = [
    doc(0, { title: "검색 경계" }),
    doc(1, { excerpt: "검색 경계 본문" }),
    doc(2, { tags: ["검색"] }),
  ]
  const fake = dependencies({ docs, key: "test-key", response: upstream("upstream raw", 429) })

  const response = await createSearchHandler(fake.deps)(request({ query: "검색" }))

  assert.equal(response.status, 200)
  const body = await json(response)
  assert.equal(body.method, "keyword-fallback")
  assert.deepEqual(body.results, docs.slice(0, 2))
  assert.equal(fake.calls().fetchCalls, 1)
})

test("AI 200의 직접 배열·문장 속 배열·빈 배열만 정상 검색 결과로 반환한다", async () => {
  const cases = [
    { content: "[0, 2]", expected: [doc(0), doc(2)] },
    { content: "관련 문서는 [1, 3] 입니다.", expected: [doc(1), doc(3)] },
    { content: "[]", expected: [] },
    { content: "관련 문서가 없습니다: []", expected: [] },
  ]

  for (const { content, expected } of cases) {
    const fake = dependencies({ key: "test-key", response: upstream(content) })
    const response = await createSearchHandler(fake.deps)(request({ query: "관련 자료" }))
    assert.equal(response.status, 200, content)
    assert.deepEqual(await json(response), { results: expected, method: "ai" }, content)
    assert.equal(fake.calls().fetchCalls, 1)
  }
})

test("balanced top-level 배열 후보 하나만 허용하고 중첩·복수 후보는 거부한다", async () => {
  const valid = dependencies({ key: "test-key", response: upstream("설명 전 [0, 2] 설명 후") })
  const validResponse = await createSearchHandler(valid.deps)(request({ query: "관련 자료" }))
  assert.equal(validResponse.status, 200)
  assert.deepEqual(await json(validResponse), { results: [doc(0), doc(2)], method: "ai" })

  for (const content of ["[[0,1]]", "[[[2]]]", "[ [0, 1] ]", "후보 [0] 또는 [1]"]) {
    const fake = dependencies({ key: "test-key", response: upstream(content) })
    const response = await createSearchHandler(fake.deps)(request({ query: "관련 자료" }))
    assert.equal(response.status, 502, content)
    assert.deepEqual(await json(response), {
      ok: false,
      code: "AI_RESPONSE_INVALID",
      error: INVALID_AI_ERROR,
      results: [],
      method: "ai",
    }, content)
  }
})

test("AI 200의 content 경계 실패는 raw upstream 정보를 숨긴 502로 처리한다", async () => {
  const secret = "raw-private-value C:\\Users\\private\\brain [response_key]"
  const payloads: unknown[] = [
    {},
    { choices: [] },
    { choices: [{ message: {} }] },
    { choices: [{ message: { content: null } }] },
    { choices: [{ message: { content: { indices: [0] } } }] },
    { choices: [{ message: { content: `배열이 없습니다 ${secret}` } }] },
    { choices: [{ message: { content: `[0,] ${secret}` } }] },
  ]

  for (const payload of payloads) {
    const fake = dependencies({ key: "test-key", response: Response.json(payload) })
    const response = await createSearchHandler(fake.deps)(request({ query: "관련 자료" }))
    assert.equal(response.status, 502)
    const body = await json(response)
    assert.deepEqual(body, {
      ok: false,
      code: "AI_RESPONSE_INVALID",
      error: INVALID_AI_ERROR,
      results: [],
      method: "ai",
    })
    assert.doesNotMatch(JSON.stringify(body), /raw-private-value|Users|private|response_key/)
  }
})

test("AI upstream JSON 해석 실패도 같은 안전한 502 계약을 반환한다", async () => {
  const fake = dependencies({
    key: "test-key",
    response: new Response("raw-private-value C:\\Users\\private", {
      status: 200,
      headers: { "content-type": "text/plain" },
    }),
  })

  const response = await createSearchHandler(fake.deps)(request({ query: "관련 자료" }))
  assert.equal(response.status, 502)
  assert.deepEqual(await json(response), {
    ok: false,
    code: "AI_RESPONSE_INVALID",
    error: INVALID_AI_ERROR,
    results: [],
    method: "ai",
  })
})

test("AI index는 정수·범위·중복 없음·최대 5개를 모두 만족해야 한다", async () => {
  const invalidArrays = [
    "[0.5]",
    "[-1]",
    "[6]",
    "[0, 0]",
    "[0, 1, 2, 3, 4, 5]",
    "[0, \"1\"]",
    "[null]",
    "후보 [0] 또는 [1]",
  ]

  for (const content of invalidArrays) {
    const fake = dependencies({ key: "test-key", response: upstream(content) })
    const response = await createSearchHandler(fake.deps)(request({ query: "관련 자료" }))
    assert.equal(response.status, 502, content)
    const body = await json(response)
    assert.equal(body.code, "AI_RESPONSE_INVALID", content)
    assert.deepEqual(body.results, [], content)
  }

  const valid = dependencies({ key: "test-key", response: upstream("[0, 1, 2, 3, 4]") })
  const response = await createSearchHandler(valid.deps)(request({ query: "관련 자료" }))
  assert.equal(response.status, 200)
  assert.deepEqual((await json(response)).results, [doc(0), doc(1), doc(2), doc(3), doc(4)])
})

test("AI index 범위와 결과 매핑은 prompt에 노출한 candidateDocs 80개로 제한한다", async () => {
  const docs = Array.from({ length: 100 }, (_, index) => doc(index))

  async function search(content: string): Promise<{ response: Response; prompt: string }> {
    let prompt = ""
    const deps: SearchHandlerDependencies = {
      listDocs: async () => docs,
      getApiKey: () => "test-key",
      fetchUpstream: async (_input, init) => {
        const upstreamBody = JSON.parse(String(init?.body)) as {
          messages: Array<{ content: string }>
        }
        prompt = upstreamBody.messages[0]?.content ?? ""
        return upstream(content)
      },
    }
    const response = await createSearchHandler(deps)(request({ query: "관련 자료" }))
    return { response, prompt }
  }

  const exposed = await search("[79]")
  assert.equal(exposed.response.status, 200)
  assert.deepEqual(await json(exposed.response), { results: [doc(79)], method: "ai" })
  assert.match(exposed.prompt, /\[79\] 문서 79/)
  assert.doesNotMatch(exposed.prompt, /\[80\] 문서 80/)

  for (const content of ["[80]", "[90]"]) {
    const hidden = await search(content)
    assert.equal(hidden.response.status, 502, content)
    const body = await json(hidden.response)
    assert.equal(body.code, "AI_RESPONSE_INVALID", content)
    assert.deepEqual(body.results, [], content)
  }
})

test("production route는 검색 controller와 주입 경계에만 연결된다", async () => {
  const source = await readFile("src/app/api/search/route.ts", "utf8")
  assert.match(source, /createSearchHandler/)
  assert.match(source, /fetchUpstream/)
  assert.doesNotMatch(source, /choices\?\.|content\.match|JSON\.parse\(content/)
})
