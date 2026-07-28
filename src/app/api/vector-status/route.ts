import { NextResponse } from "next/server"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"

export const dynamic = "force-dynamic"

function loadDashboardEnv() {
  const p = resolve(/* turbopackIgnore: true */ process.cwd(), "..", ".env")
  if (existsSync(p)) config({ path: p })
}
loadDashboardEnv()

const QDRANT_URL = (process.env.QDRANT_URL?.trim() || "http://localhost:6333").replace(/\/+$/, "")

interface CollectionInfo {
  name: string
  points: number | null
  dim: number | null
}

interface VectorStatusResponse {
  ok: boolean
  url: string
  collections: CollectionInfo[]
  totalPoints: number
  error?: string
  generatedAt: string
}

async function fetchJson(url: string, timeoutMs = 3000): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function GET() {
  const generatedAt = new Date().toISOString()
  try {
    const list = (await fetchJson(`${QDRANT_URL}/collections`)) as {
      result?: { collections?: { name: string }[] }
    }
    const names = (list.result?.collections ?? []).map((c) => c.name)

    const collections: CollectionInfo[] = await Promise.all(
      names.map(async (name): Promise<CollectionInfo> => {
        try {
          const detail = (await fetchJson(`${QDRANT_URL}/collections/${encodeURIComponent(name)}`)) as {
            result?: { points_count?: number; config?: { params?: { vectors?: { size?: number } } } }
          }
          const result = detail.result ?? {}
          const points = typeof result.points_count === "number" ? result.points_count : null
          const dim = typeof result.config?.params?.vectors?.size === "number"
            ? result.config.params.vectors.size
            : null
          return { name, points, dim }
        } catch {
          // 개별 컬렉션 상세 조회 실패 — 이름만 표기하고 계속(graceful)
          return { name, points: null, dim: null }
        }
      })
    )

    const totalPoints = collections.reduce((sum, c) => sum + (c.points ?? 0), 0)

    const body: VectorStatusResponse = { ok: true, url: QDRANT_URL, collections, totalPoints, generatedAt }
    return NextResponse.json(body)
  } catch (e: unknown) {
    const body: VectorStatusResponse = {
      ok: false,
      url: QDRANT_URL,
      collections: [],
      totalPoints: 0,
      error: e instanceof Error ? e.message : "Qdrant 연결 실패",
      generatedAt,
    }
    return NextResponse.json(body)
  }
}
