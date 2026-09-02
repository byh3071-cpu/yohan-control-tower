import assert from "node:assert/strict"
import { test } from "node:test"

import {
  configuredPreviewHostname,
  isTrustedHostname,
  originMatchesExpected,
  PREVIEW_HOST_ENV,
} from "./request-guard.js"

test("미리보기 호스트 env는 정확한 hostname만 받고 와일드카드·URL은 버린다", () => {
  assert.equal(configuredPreviewHostname({}), null)
  assert.equal(configuredPreviewHostname({ [PREVIEW_HOST_ENV]: "preview.example" }), "preview.example")
  assert.equal(configuredPreviewHostname({ [PREVIEW_HOST_ENV]: "Preview.Example" }), "preview.example")
  assert.equal(configuredPreviewHostname({ [PREVIEW_HOST_ENV]: "*.trycloudflare.com" }), null)
  assert.equal(configuredPreviewHostname({ [PREVIEW_HOST_ENV]: "https://preview.example" }), null)
  assert.equal(configuredPreviewHostname({ [PREVIEW_HOST_ENV]: "preview.example:443" }), null)
  assert.equal(configuredPreviewHostname({ [PREVIEW_HOST_ENV]: "localhost" }), null)
})

test("신뢰 hostname은 loopback과 설정된 미리보기 호스트만이다", () => {
  const env = { [PREVIEW_HOST_ENV]: "preview.example" }
  assert.equal(isTrustedHostname("localhost", env), true)
  assert.equal(isTrustedHostname("127.0.0.1", env), true)
  assert.equal(isTrustedHostname("preview.example", env), true)
  assert.equal(isTrustedHostname("evil.example", env), false)
  assert.equal(isTrustedHostname("preview.example", {}), false)
})

test("미리보기 origin은 https 터널과 http origin hostname만 맞으면 통과한다", () => {
  const env = { [PREVIEW_HOST_ENV]: "preview.example" }
  const expected = new URL("http://preview.example/api/calendar")
  assert.equal(originMatchesExpected("https://preview.example", expected, env), true)
  assert.equal(originMatchesExpected("http://evil.example", expected, env), false)
  assert.equal(originMatchesExpected("https://preview.example", expected, {}), false)
})
