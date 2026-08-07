import { NextResponse } from "next/server"

import { withNoStoreJson } from "@/lib/http-cache"
import { getMissionsCached, getMissionsCacheMeta } from "@/lib/missions"
import type { MissionsResponse } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get("fresh") === "1"
  try {
    const data = await getMissionsCached(fresh)
    const response = withNoStoreJson(NextResponse.json(data))
    const meta = getMissionsCacheMeta()
    response.headers.set("x-cache-missions", meta.hit ? "hit" : "miss")
    response.headers.set("x-cache-missions-age-ms", String(meta.ageMs ?? -1))
    return response
  } catch (error: unknown) {
    const payload: MissionsResponse = {
      ok: false,
      setupRequired: false,
      missions: [],
      coverage: {
        configuredProjects: 0,
        assignedProjects: 0,
        unassignedProjects: 0,
        localAssignedProjects: 0,
        unknownAssignedProjects: 0,
      },
      sourceVersion: null,
      generatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }
    return withNoStoreJson(NextResponse.json(payload, { status: 500 }))
  }
}
