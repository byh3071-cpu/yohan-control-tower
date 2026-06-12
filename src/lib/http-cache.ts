import type { NextResponse } from "next/server"

/** 브라우저·중간 캐시가 문서 목록 등 가변 JSON을 잡지 않도록 */
export function withNoStoreJson(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate")
  res.headers.set("Pragma", "no-cache")
  return res
}
