import type { NextRequest } from "next/server"
import { listDocs } from "@/lib/memory"
import { loadBrainEnv } from "@/lib/paths"
import { createSearchHandler } from "@/lib/search-controller"

export const dynamic = "force-dynamic"

const handleSearch = createSearchHandler({
  listDocs,
  getApiKey: () => {
    // brain `.env` 의 키를 요청 시점에 로드한다. 모듈 레벨이면 resolveRepoRoot() 의
    // throw 가 라우트 로드를 막는다.
    loadBrainEnv()
    return process.env.OPENAI_API_KEY
  },
  fetchUpstream: (input, init) => fetch(input, init),
})

export async function POST(request: NextRequest): Promise<Response> {
  return handleSearch(request)
}
