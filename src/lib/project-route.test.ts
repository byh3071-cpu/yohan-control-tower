import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const MUTATING_EXPORT = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/

test("Project 목록·상세 API는 GET-only 경계를 유지한다", async () => {
  const routes = await Promise.all([
    readFile("src/app/api/projects/route.ts", "utf8"),
    readFile("src/app/api/projects/[slug]/route.ts", "utf8"),
  ])

  for (const source of routes) {
    assert.match(source, /export\s+async\s+function\s+GET\b/)
    assert.doesNotMatch(source, MUTATING_EXPORT)
  }
})
