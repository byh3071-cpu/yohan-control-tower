import { NextResponse } from "next/server"

import { withNoStoreJson } from "@/lib/http-cache"
import { getProjects } from "@/lib/projects"
import type { ProjectsResponse } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    return withNoStoreJson(NextResponse.json(await getProjects()))
  } catch {
    const payload: ProjectsResponse = {
      ok: false,
      setupRequired: false,
      missions: [],
      unassignedProjects: 0,
      sourceVersion: null,
      generatedAt: new Date().toISOString(),
      error: "프로젝트 원장을 읽지 못했습니다.",
    }
    return withNoStoreJson(NextResponse.json(payload, { status: 500 }))
  }
}
