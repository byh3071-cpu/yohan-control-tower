import { NextResponse } from "next/server"

import { withNoStoreJson } from "@/lib/http-cache"
import { getProjectDetail } from "@/lib/projects"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    return withNoStoreJson(NextResponse.json(await getProjectDetail(slug)))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const status = message.includes("없는 프로젝트") ? 404 : message.includes("유효하지 않은") ? 400 : 500
    return withNoStoreJson(NextResponse.json({
      ok: false,
      setupRequired: false,
      project: null,
      goals: [],
      available: false,
      generatedAt: new Date().toISOString(),
      error: message,
    }, { status }))
  }
}
