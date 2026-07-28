import { NextResponse } from "next/server"
import { listEvaluationDetails } from "@/lib/memory"
import { withNoStoreJson } from "@/lib/http-cache"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const lim = Math.min(80, Math.max(1, parseInt(url.searchParams.get("limit") ?? "24", 10) || 24))
  const items = await listEvaluationDetails(lim)
  return withNoStoreJson(NextResponse.json({ items }))
}
