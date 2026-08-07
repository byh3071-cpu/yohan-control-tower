import { NextRequest, NextResponse } from "next/server"

import {
  CalendarConflictError,
  CalendarInputError,
  createCalendarItem,
  listCalendarTrash,
  listCalendarRange,
  restoreCalendarItem,
  setCalendarTaskCompletion,
  trashCalendarItem,
  updateCalendarItem,
} from "@/lib/calendar"
import { withNoStoreJson } from "@/lib/http-cache"
import { isLocalReadRequest, isSameOriginRequest } from "@/lib/inbox-controller"
import { resolveCalendarRoot } from "@/lib/paths"
import type { CalendarCreateInput, CalendarResponse, CalendarTrashResponse, CalendarUpdateInput } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_BODY_BYTES = 32 * 1024

function todaySeoul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date())
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new CalendarInputError("Content-Type은 application/json이어야 합니다.")
  }
  const length = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new CalendarInputError("요청 본문이 너무 큽니다.")
  const raw = await request.text()
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw new CalendarInputError("요청 본문이 너무 큽니다.")
  let value: unknown
  try {
    value = JSON.parse(raw) as unknown
  } catch {
    throw new CalendarInputError("올바른 JSON 본문이 필요합니다.")
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CalendarInputError("JSON 객체가 필요합니다.")
  }
  return value as Record<string, unknown>
}

function setupResponse(from: string, to: string, error: unknown) {
  const payload: CalendarResponse = {
    ok: true,
    setupRequired: true,
    from,
    to,
    occurrences: [],
    sourceItems: 0,
    issues: [],
    generatedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  }
  return withNoStoreJson(NextResponse.json(payload))
}

function setupWriteResponse(error: unknown) {
  return withNoStoreJson(NextResponse.json({
    ok: false,
    setupRequired: true,
    error: error instanceof Error ? error.message : String(error),
  }, { status: 409 }))
}

function setupTrashResponse(error: unknown) {
  const payload: CalendarTrashResponse = {
    ok: true,
    setupRequired: true,
    items: [],
    issues: [],
    generatedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  }
  return withNoStoreJson(NextResponse.json(payload))
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const status = error instanceof CalendarConflictError ? 409 : error instanceof CalendarInputError ? 400 : 500
  if (status === 500) console.error("[calendar] 요청 처리 실패:", message)
  return withNoStoreJson(NextResponse.json({ ok: false, error: message }, { status }))
}

export async function GET(request: NextRequest) {
  if (!isLocalReadRequest(request)) {
    return withNoStoreJson(NextResponse.json({ ok: false, error: "로컬 조회 요청만 허용합니다." }, { status: 403 }))
  }
  const today = todaySeoul()
  const from = request.nextUrl.searchParams.get("from") ?? today
  const to = request.nextUrl.searchParams.get("to") ?? from
  const view = request.nextUrl.searchParams.get("view")
  if (view && view !== "trash") return errorResponse(new CalendarInputError("지원하지 않는 Calendar view입니다."))
  try {
    resolveCalendarRoot()
  } catch (error: unknown) {
    return view === "trash" ? setupTrashResponse(error) : setupResponse(from, to, error)
  }

  try {
    if (view === "trash") {
      const result = await listCalendarTrash()
      const payload: CalendarTrashResponse = {
        ok: true,
        setupRequired: false,
        ...result,
        generatedAt: new Date().toISOString(),
      }
      return withNoStoreJson(NextResponse.json(payload))
    }
    const result = await listCalendarRange(from, to)
    const payload: CalendarResponse = {
      ok: true,
      setupRequired: false,
      from,
      to,
      ...result,
      generatedAt: new Date().toISOString(),
    }
    return withNoStoreJson(NextResponse.json(payload))
  } catch (error: unknown) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return withNoStoreJson(NextResponse.json({ ok: false, error: "로컬 same-origin 쓰기만 허용합니다." }, { status: 403 }))
  }
  try {
    resolveCalendarRoot()
  } catch (error: unknown) {
    return setupWriteResponse(error)
  }

  try {
    const body = await readJsonBody(request)
    const input: CalendarCreateInput = {
      kind: body.kind as CalendarCreateInput["kind"],
      title: body.title as string,
      date: body.date as string,
      startTime: body.startTime as string | null | undefined,
      endTime: body.endTime as string | null | undefined,
      recurrence: body.recurrence as CalendarCreateInput["recurrence"],
      recurrenceInterval: body.recurrenceInterval as number | undefined,
      recurrenceUntil: body.recurrenceUntil as string | null | undefined,
      notes: body.notes as string | undefined,
    }
    const item = await createCalendarItem(input)
    return withNoStoreJson(NextResponse.json({ ok: true, item }, { status: 201 }))
  } catch (error: unknown) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return withNoStoreJson(NextResponse.json({ ok: false, error: "로컬 same-origin 쓰기만 허용합니다." }, { status: 403 }))
  }
  try {
    resolveCalendarRoot()
  } catch (error: unknown) {
    return setupWriteResponse(error)
  }

  try {
    const body = await readJsonBody(request)
    if (body.action === "set_task_completion") {
      if (typeof body.id !== "string" || typeof body.occurrenceDate !== "string" || typeof body.done !== "boolean") {
        throw new CalendarInputError("id, occurrenceDate, done이 필요합니다.")
      }
      const item = await setCalendarTaskCompletion(body.id, body.occurrenceDate, body.done)
      return withNoStoreJson(NextResponse.json({ ok: true, item }))
    }
    if (body.action === "update_item") {
      if (typeof body.id !== "string" || typeof body.expectedUpdatedAt !== "string") {
        throw new CalendarInputError("id와 expectedUpdatedAt이 필요합니다.")
      }
      const input: CalendarUpdateInput = {
        title: body.title as string,
        date: body.date as string,
        startTime: body.startTime as string | null | undefined,
        endTime: body.endTime as string | null | undefined,
        recurrence: body.recurrence as CalendarUpdateInput["recurrence"],
        recurrenceInterval: body.recurrenceInterval as number | undefined,
        recurrenceUntil: body.recurrenceUntil as string | null | undefined,
        notes: body.notes as string | undefined,
        expectedUpdatedAt: body.expectedUpdatedAt,
      }
      const item = await updateCalendarItem(body.id, input)
      return withNoStoreJson(NextResponse.json({ ok: true, item }))
    }
    if (body.action === "restore_item") {
      if (typeof body.trashId !== "string") throw new CalendarInputError("trashId가 필요합니다.")
      const item = await restoreCalendarItem(body.trashId)
      return withNoStoreJson(NextResponse.json({ ok: true, item }))
    }
    throw new CalendarInputError("지원하지 않는 Calendar action입니다.")
  } catch (error: unknown) {
    return errorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return withNoStoreJson(NextResponse.json({ ok: false, error: "로컬 same-origin 쓰기만 허용합니다." }, { status: 403 }))
  }
  try {
    resolveCalendarRoot()
  } catch (error: unknown) {
    return setupWriteResponse(error)
  }

  try {
    const body = await readJsonBody(request)
    if (typeof body.id !== "string" || typeof body.expectedUpdatedAt !== "string") {
      throw new CalendarInputError("id와 expectedUpdatedAt이 필요합니다.")
    }
    const item = await trashCalendarItem(body.id, body.expectedUpdatedAt)
    return withNoStoreJson(NextResponse.json({ ok: true, item }))
  } catch (error: unknown) {
    return errorResponse(error)
  }
}
