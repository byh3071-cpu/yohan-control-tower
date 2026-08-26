import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { POST } from "@/app/api/run/route"

const LOCAL_URL = "http://localhost:3001/api/run"
const LOCAL_HEADERS = {
  host: "localhost:3001",
  origin: "http://localhost:3001",
  "content-type": "application/json",
}

test("production route도 실행 없이 cross-origin·malformed JSON·human gate를 차단한다", async () => {
  const crossOrigin = await POST(new Request(LOCAL_URL, {
    method: "POST",
    headers: { ...LOCAL_HEADERS, origin: "https://evil.example" },
    body: JSON.stringify({ action: "build" }),
  }))
  assert.equal(crossOrigin.status, 403)

  const malformed = await POST(new Request(LOCAL_URL, {
    method: "POST",
    headers: LOCAL_HEADERS,
    body: "{",
  }))
  assert.equal(malformed.status, 400)

  const humanGate = await POST(new Request(LOCAL_URL, {
    method: "POST",
    headers: LOCAL_HEADERS,
    body: JSON.stringify({ action: "git:sync" }),
  }))
  const body = await humanGate.json() as Record<string, unknown>
  assert.equal(humanGate.status, 403)
  assert.equal(body.humanGate, true)
})

test("route는 child_process를 직접 소유하지 않고 controller·runner에 위임한다", async () => {
  const source = await readFile("src/app/api/run/route.ts", "utf8")
  assert.doesNotMatch(source, /node:child_process|\bexec\s*\(/)
  assert.match(source, /createRunCommandHandler/)
  assert.match(source, /createExecFileRunner/)
})
