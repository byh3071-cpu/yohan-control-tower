import { NextRequest, NextResponse } from "next/server"
import { getDoc } from "@/lib/memory"
import { withNoStoreJson } from "@/lib/http-cache"

export const dynamic = "force-dynamic"

function isSafePath(segments: string[]): boolean {
  return segments.every(
    (s) => s.length > 0 && s !== ".." && s !== "." && !s.includes("\\") && !s.includes("\0")
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  if (!isSafePath(path)) {
    return withNoStoreJson(NextResponse.json({ error: "invalid path" }, { status: 400 }))
  }

  const relPath = path.join("/")
  const doc = await getDoc(relPath)
  if (!doc) return withNoStoreJson(NextResponse.json({ error: "not found" }, { status: 404 }))
  return withNoStoreJson(NextResponse.json(doc))
}
