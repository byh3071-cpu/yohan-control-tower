import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  PRODUCT_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_NAME_EN,
  PRODUCT_NAME_SHORT,
} from "./product"

test("화면 이름은 요한 OS가 아니라 관제탑이다", () => {
  assert.equal(PRODUCT_NAME, "요한 관제탑")
  assert.equal(PRODUCT_NAME_SHORT, "관제탑")
  assert.equal(PRODUCT_NAME_EN, "Yohan Control Tower")
  assert.doesNotMatch(PRODUCT_NAME, /OS/)
  assert.doesNotMatch(PRODUCT_NAME_EN, /Yohan OS/)
  assert.doesNotMatch(PRODUCT_DESCRIPTION, /Yohan OS/)
})

test("브라우저 크롬이 화면 이름 상수를 쓴다", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8")
  const header = readFileSync(new URL("../components/header.tsx", import.meta.url), "utf8")
  const vector = readFileSync(new URL("../components/vector/vector-panel.tsx", import.meta.url), "utf8")
  const manifest = JSON.parse(
    readFileSync(new URL("../../public/manifest.json", import.meta.url), "utf8")
  ) as { name: string; short_name: string; description: string }

  assert.match(layout, /PRODUCT_NAME/)
  assert.match(layout, /PRODUCT_DESCRIPTION/)
  assert.doesNotMatch(layout, /Yohan OS/)
  assert.match(header, /PRODUCT_NAME_SHORT/)
  assert.doesNotMatch(header, /Yohan OS/)
  assert.match(vector, /PRODUCT_NAME_SHORT/)
  assert.doesNotMatch(vector, /Yohan OS/)
  assert.equal(manifest.name, PRODUCT_NAME)
  assert.equal(manifest.short_name, PRODUCT_NAME_SHORT)
  assert.equal(manifest.description, PRODUCT_DESCRIPTION)
})
