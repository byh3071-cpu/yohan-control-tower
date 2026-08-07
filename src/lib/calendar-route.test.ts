import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { NextRequest } from "next/server"

import { DELETE, GET, PATCH, POST } from "@/app/api/calendar/route"

function request(method: string, body?: Record<string, unknown>, origin = "http://localhost:3001") {
  return new NextRequest("http://localhost:3001/api/calendar", {
    method,
    headers: {
      host: "localhost:3001",
      origin,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

test("Calendar API는 same-origin 삭제·409 충돌·휴지통 목록·복구를 구분한다", async () => {
  const root = await mkdtemp(join(tmpdir(), "yohan-calendar-route-test-"))
  const previousRoot = process.env.YOHAN_CALENDAR_ROOT
  process.env.YOHAN_CALENDAR_ROOT = root
  try {
    const createResponse = await POST(request("POST", {
      kind: "event",
      title: "API 휴지통 검증",
      date: "2026-08-07",
      recurrence: "none",
    }))
    assert.equal(createResponse.status, 201)
    const created = await createResponse.json() as { item: { id: string; updatedAt: string } }

    const forbidden = await DELETE(request("DELETE", {
      id: created.item.id,
      expectedUpdatedAt: created.item.updatedAt,
    }, "https://example.com"))
    assert.equal(forbidden.status, 403)

    const conflict = await DELETE(request("DELETE", {
      id: created.item.id,
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
    }))
    assert.equal(conflict.status, 409)

    const deleteResponse = await DELETE(request("DELETE", {
      id: created.item.id,
      expectedUpdatedAt: created.item.updatedAt,
    }))
    assert.equal(deleteResponse.status, 200)
    const deleted = await deleteResponse.json() as { item: { trashId: string } }

    const trashResponse = await GET(new NextRequest("http://localhost:3001/api/calendar?view=trash", {
      headers: { host: "localhost:3001" },
    }))
    assert.equal(trashResponse.status, 200)
    const trash = await trashResponse.json() as { items: Array<{ trashId: string }> }
    assert.deepEqual(trash.items.map((entry) => entry.trashId), [deleted.item.trashId])

    const restoreResponse = await PATCH(request("PATCH", {
      action: "restore_item",
      trashId: deleted.item.trashId,
    }))
    assert.equal(restoreResponse.status, 200)

    const activeResponse = await GET(new NextRequest(
      "http://localhost:3001/api/calendar?from=2026-08-07&to=2026-08-07",
      { headers: { host: "localhost:3001" } }
    ))
    const active = await activeResponse.json() as { occurrences: Array<{ title: string }> }
    assert.deepEqual(active.occurrences.map((entry) => entry.title), ["API 휴지통 검증"])
  } finally {
    if (previousRoot === undefined) delete process.env.YOHAN_CALENDAR_ROOT
    else process.env.YOHAN_CALENDAR_ROOT = previousRoot
    await rm(root, { recursive: true, force: true })
  }
})
