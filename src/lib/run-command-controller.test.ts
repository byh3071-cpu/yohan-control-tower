import assert from "node:assert/strict"
import test from "node:test"

import {
  createActionRegistry,
  createRunCommandHandler,
  MAX_INGEST_URL_CHARS,
  RUN_MAX_BUFFER_BYTES,
  RUN_TIMEOUT_MS,
  type RunCommandInvocation,
} from "./run-command-controller"
import { RunCommandExecutionError } from "./run-command-runner"

const LOCAL_URL = "http://localhost:3001/api/run"
const WINDOWS_NODE = "C:\\nodejs\\node.exe"
const WINDOWS_NPM_BIN = "C:\\nodejs\\node_modules\\npm\\bin"
const LOCAL_HEADERS = {
  host: "localhost:3001",
  origin: "http://localhost:3001",
  "content-type": "application/json",
}

type HarnessOptions = {
  run?: (invocation: RunCommandInvocation) => Promise<{ stdout: string; stderr: string }>
  root?: () => string
}

function createHarness(options: HarnessOptions = {}) {
  const events: string[] = []
  const invocations: RunCommandInvocation[] = []
  const handler = createRunCommandHandler({
    registry: createActionRegistry("win32", WINDOWS_NODE),
    resolveRepoRoot: () => {
      events.push("resolver")
      return options.root?.() ?? "C:\\brain-fixture"
    },
    runner: async (invocation) => {
      events.push("runner")
      invocations.push(invocation)
      return options.run?.(invocation) ?? { stdout: "ok", stderr: "" }
    },
  })
  return { events, handler, invocations }
}

function jsonRequest(body: unknown, init: { url?: string; headers?: HeadersInit } = {}): Request {
  return new Request(init.url ?? LOCAL_URL, {
    method: "POST",
    headers: init.headers ?? LOCAL_HEADERS,
    body: JSON.stringify(body),
  })
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>
}

class ObservedJsonRequest extends Request {
  constructor(
    private readonly events: string[],
    private readonly jsonValue: unknown,
    url: string,
    headers: HeadersInit,
  ) {
    super(url, { method: "POST", headers, body: "{}" })
  }

  override async json(): Promise<unknown> {
    this.events.push("body")
    return this.jsonValue
  }
}

test("same-origin 검사가 body·resolver·runner보다 먼저 외부 요청을 fail closed 한다", async () => {
  const cases = [
    {
      name: "external host",
      url: "http://evil.example/api/run",
      headers: { ...LOCAL_HEADERS, host: "evil.example", origin: "http://evil.example" },
    },
    {
      name: "cross origin",
      url: LOCAL_URL,
      headers: { ...LOCAL_HEADERS, origin: "https://evil.example" },
    },
    {
      name: "headerless mutation",
      url: LOCAL_URL,
      headers: { "content-type": "application/json" },
    },
  ]

  for (const entry of cases) {
    const harness = createHarness()
    const request = new ObservedJsonRequest(harness.events, { action: "build" }, entry.url, entry.headers)
    const response = await harness.handler(request)
    assert.equal(response.status, 403, entry.name)
    assert.deepEqual(harness.events, [], entry.name)
    assert.deepEqual(harness.invocations, [], entry.name)
  }
})

test("검증된 Origin 없는 same-origin 브라우저 POST는 Fetch Metadata와 Referer를 모두 요구한다", async () => {
  const harness = createHarness()
  const request = jsonRequest({ action: "build" }, {
    headers: {
      host: "localhost:3001",
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      referer: "http://localhost:3001/",
    },
  })

  const response = await harness.handler(request)
  assert.equal(response.status, 200)
  assert.deepEqual(harness.events, ["resolver", "runner"])
})

test("Content-Type은 application/json media type과 선택적 UTF-8 charset만 허용한다", async () => {
  for (const contentType of [
    "application/json",
    "Application/JSON",
    "application/json; charset=utf-8",
    "APPLICATION/JSON; CHARSET=UTF-8",
  ]) {
    const harness = createHarness()
    const request = new ObservedJsonRequest(
      harness.events,
      { action: "build" },
      LOCAL_URL,
      { ...LOCAL_HEADERS, "content-type": contentType },
    )

    const response = await harness.handler(request)
    assert.equal(response.status, 200, contentType)
    assert.deepEqual(harness.events, ["body", "resolver", "runner"], contentType)
  }

  for (const contentType of [
    "application/jsonp",
    "application/json-seq",
    "application/jsonEVIL",
    "text/plain",
    "application/json; profile=evil",
  ]) {
    const harness = createHarness()
    const request = new ObservedJsonRequest(
      harness.events,
      { action: "build" },
      LOCAL_URL,
      { ...LOCAL_HEADERS, "content-type": contentType },
    )

    const response = await harness.handler(request)
    const body = await responseBody(response)
    assert.equal(response.status, 400, contentType)
    assert.equal(body.code, "INVALID_CONTENT_TYPE", contentType)
    assert.deepEqual(harness.events, [], contentType)
  }
})

test("malformed JSON·타입·unknown action·금지 필드를 결정론적 400으로 거부한다", async () => {
  const malformed = new Request(LOCAL_URL, {
    method: "POST",
    headers: LOCAL_HEADERS,
    body: "{",
  })
  const cases: Array<{ name: string; request: Request; code: string }> = [
    { name: "malformed JSON", request: malformed, code: "INVALID_JSON" },
    { name: "array body", request: jsonRequest([]), code: "INVALID_BODY" },
    { name: "wrong action type", request: jsonRequest({ action: 1 }), code: "INVALID_ACTION" },
    { name: "unknown action", request: jsonRequest({ action: "unknown" }), code: "UNKNOWN_ACTION" },
    { name: "forbidden args", request: jsonRequest({ action: "build", args: "--watch" }), code: "ARGS_FORBIDDEN" },
    { name: "unknown field", request: jsonRequest({ action: "build", extra: true }), code: "INVALID_BODY" },
    { name: "missing URL", request: jsonRequest({ action: "ingest:url" }), code: "URL_REQUIRED" },
  ]

  for (const entry of cases) {
    const harness = createHarness()
    const response = await harness.handler(entry.request)
    const body = await responseBody(response)
    assert.equal(response.status, 400, entry.name)
    assert.equal(body.code, entry.code, entry.name)
    assert.deepEqual(harness.events, [], entry.name)
  }
})

test("ingest:url은 bounded credential-free HTTP(S) URL만 허용한다", async () => {
  const cases = [
    "not a URL",
    "ftp://example.com/file",
    "https://user:password@example.com/private",
    `https://example.com/${"a".repeat(MAX_INGEST_URL_CHARS)}`,
  ]

  for (const value of cases) {
    const harness = createHarness()
    const response = await harness.handler(jsonRequest({ action: "ingest:url", args: value }))
    assert.equal(response.status, 400, value.slice(0, 60))
    assert.deepEqual(harness.events, [])
  }
})

test("ingest:url은 C0·DEL·C1·line separator·bidi control을 원문 단계에서 거부한다", async () => {
  const controls = [
    ["C0", "\u0000"],
    ["DEL", "\u007f"],
    ["C1", "\u0085"],
    ["line separator", "\u2028"],
    ["paragraph separator", "\u2029"],
    ["bidi override", "\u202e"],
    ["bidi isolate", "\u2066"],
  ] as const

  for (const [name, control] of controls) {
    const value = `https://example.com/search?q=safe${control}hidden`
    const harness = createHarness()
    const response = await harness.handler(jsonRequest({ action: "ingest:url", args: value }))
    const body = await responseBody(response)

    assert.equal(response.status, 400, name)
    assert.equal(body.code, "INVALID_URL", name)
    assert.deepEqual(harness.events, [], name)
  }
})

test("정상 URL query 문자를 변경하지 않고 단일 argv로 전달하며 shell을 열지 않는다", async () => {
  const url = "https://example.com/search?q=a&next=$(whoami);echo|safe%20value#frag"
  const harness = createHarness()

  const response = await harness.handler(jsonRequest({ action: "ingest:url", args: url }))
  assert.equal(response.status, 200)
  assert.deepEqual(harness.events, ["resolver", "runner"])
  assert.deepEqual(harness.invocations, [{
    executable: WINDOWS_NODE,
    argv: [`${WINDOWS_NPM_BIN}\\npx-cli.js`, "tsx", "src/ingest-url-cli.ts", url],
    cwd: "C:\\brain-fixture",
    options: {
      shell: false,
      timeoutMs: RUN_TIMEOUT_MS,
      maxBufferBytes: RUN_MAX_BUFFER_BYTES,
    },
  }])
})

test("args 없는 action은 Windows node.exe와 고정 npm-cli.js argv만 사용한다", async () => {
  const harness = createHarness()
  const response = await harness.handler(jsonRequest({ action: "report:weekly" }))

  assert.equal(response.status, 200)
  assert.deepEqual(harness.invocations[0], {
    executable: WINDOWS_NODE,
    argv: [`${WINDOWS_NPM_BIN}\\npm-cli.js`, "run", "report:weekly"],
    cwd: "C:\\brain-fixture",
    options: {
      shell: false,
      timeoutMs: RUN_TIMEOUT_MS,
      maxBufferBytes: RUN_MAX_BUFFER_BYTES,
    },
  })
})

test("POSIX registry도 shell 없이 npm/npx executable과 기존 action argv를 보존한다", () => {
  const registry = createActionRegistry("linux", "/usr/bin/node")
  assert.deepEqual(registry["ingest:url"], {
    kind: "runnable",
    executable: "npx",
    argv: ["tsx", "src/ingest-url-cli.ts"],
    input: "url",
  })
  assert.deepEqual(registry["report:weekly"], {
    kind: "runnable",
    executable: "npm",
    argv: ["run", "report:weekly"],
    input: "none",
  })
})

test("사람 게이트 action은 기존 문구를 보존하고 resolver·runner를 호출하지 않는다", async () => {
  for (const action of ["git:sync", "sync:notion:push"]) {
    const harness = createHarness()
    const response = await harness.handler(jsonRequest({ action }))
    const body = await responseBody(response)

    assert.equal(response.status, 403)
    assert.equal(body.ok, false)
    assert.equal(body.action, action)
    assert.equal(body.humanGate, true)
    assert.equal(body.error, "사람 게이트 명령입니다 — 관제탑에서 실행할 수 없습니다. 터미널에서 직접 실행하세요.")
    assert.deepEqual(harness.events, [])
  }
})

test("성공 output은 cap을 지키며 비밀과 절대경로를 제거한다", async () => {
  const secret = "RUNNER_TOKEN=super-secret-value"
  const absolutePath = "C:\\private\\repo\\file.txt"
  const harness = createHarness({
    run: async () => ({
      stdout: `${"x".repeat(2_100)}\n${secret}\n${absolutePath}`,
      stderr: absolutePath,
    }),
  })

  const response = await harness.handler(jsonRequest({ action: "build" }))
  const body = await responseBody(response)
  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.ok(String(body.stdout).length <= 2_000)
  assert.ok(String(body.stderr).length <= 500)
  assert.doesNotMatch(String(body.stdout), /super-secret-value|C:\\private/)
  assert.doesNotMatch(String(body.stderr), /C:\\private/)
})

test("output redaction은 정상 HTTP(S) URL과 route를 보존하고 절대경로만 가린다", async () => {
  const cwd = "C:\\brain-fixture"
  const harness = createHarness({
    root: () => cwd,
    run: async () => ({
      stdout: [
        "GET https://example.com/api/run?next=/api/run",
        "route /api/run is ready",
        `cwd ${cwd}`,
        "drive C:\\private\\repo\\file.ts",
        "posix /home/private/repo/file.ts",
        "unc \\\\server\\share\\folder\\file.ts",
      ].join("\n"),
      stderr: "",
    }),
  })

  const response = await harness.handler(jsonRequest({ action: "build" }))
  const body = await responseBody(response)
  const stdout = String(body.stdout)

  assert.equal(response.status, 200)
  assert.match(stdout, /https:\/\/example\.com\/api\/run\?next=\/api\/run/)
  assert.match(stdout, /route \/api\/run is ready/)
  assert.doesNotMatch(stdout, /brain-fixture|C:\\private|\/home\/private|server\\share/)
  assert.equal(stdout.match(/\[경로\]/g)?.length, 4)
})

test("output redaction은 JSON-style label·공백 포함 assignment·Bearer·Basic·URL userinfo를 가린다", async () => {
  const secrets = [
    "json secret with space",
    "object secret with space",
    "value with space",
    "bearer-token-value",
    "dXNlcjpwYXNzd29yZA==",
    "url-password",
  ]
  const bearerHeader = ["Authorization:", "Bearer", "bearer-token-value"].join(" ")
  const basicHeader = ["Authorization:", "Basic", "dXNlcjpwYXNzd29yZA=="].join(" ")
  const harness = createHarness({
    run: async () => ({
      stdout: [
        '{"apiToken":"json secret with space"}',
        "{apiToken:'object secret with space'}",
        "TOKEN = value with space",
        bearerHeader,
        basicHeader,
        "fetch https://alice:url-password@example.com/api/run",
        "build succeeded: https://example.com/api/run",
      ].join("\n"),
      stderr: "",
    }),
  })

  const response = await harness.handler(jsonRequest({ action: "build" }))
  const body = await responseBody(response)
  const stdout = String(body.stdout)

  assert.equal(response.status, 200)
  for (const secret of secrets) assert.doesNotMatch(stdout, new RegExp(secret))
  assert.match(stdout, /Authorization: Bearer \[비공개\]/)
  assert.match(stdout, /Authorization: Basic \[비공개\]/)
  assert.match(stdout, /https:\/\/\[비공개\]@example\.com\/api\/run/)
  assert.match(stdout, /build succeeded: https:\/\/example\.com\/api\/run/)
})

test("resolver 오류는 원문 절대경로를 숨긴 일관된 500 JSON을 반환한다", async () => {
  const harness = createHarness({
    root: () => { throw new Error("missing C:\\private\\brain") },
  })
  const response = await harness.handler(jsonRequest({ action: "build" }))
  const body = await responseBody(response)

  assert.equal(response.status, 500)
  assert.equal(body.code, "COMMAND_CWD_UNAVAILABLE")
  assert.doesNotMatch(JSON.stringify(body), /C:\\private|missing/)
  assert.deepEqual(harness.events, ["resolver"])
})

test("runner 실패·timeout·buffer 오류를 raw message 없이 구분한다", async () => {
  const cases = [
    { kind: "failed" as const, status: 500, code: "COMMAND_FAILED" },
    { kind: "timeout" as const, status: 504, code: "COMMAND_TIMEOUT" },
    { kind: "output-limit" as const, status: 500, code: "COMMAND_OUTPUT_LIMIT" },
  ]

  for (const entry of cases) {
    const harness = createHarness({
      run: async () => {
        throw new RunCommandExecutionError(entry.kind, {
          stdout: "RUNNER_SECRET=do-not-leak",
          stderr: "failed at C:\\private\\brain\\script.ts",
        })
      },
    })
    const response = await harness.handler(jsonRequest({ action: "build" }))
    const body = await responseBody(response)

    assert.equal(response.status, entry.status)
    assert.equal(body.code, entry.code)
    assert.doesNotMatch(JSON.stringify(body), /do-not-leak|C:\\private/)
  }
})
