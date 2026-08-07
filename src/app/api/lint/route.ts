import { NextResponse } from "next/server"

import { withNoStoreJson } from "@/lib/http-cache"
import { getLint } from "@/lib/lint"
import type { LintResponse } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    return withNoStoreJson(NextResponse.json(await getLint()))
  } catch (error: unknown) {
    const payload: LintResponse = {
      ok: false,
      setupRequired: false,
      counts: { total: 0, actionable: 0, error: 0, warning: 0, info: 0 },
      issues: [],
      excludedLocalDirs: [],
      generatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }
    return withNoStoreJson(NextResponse.json(payload, { status: 500 }))
  }
}
