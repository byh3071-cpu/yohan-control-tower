"use client"

import { useState, useEffect, useCallback } from "react"
import { Database, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollectionInfo {
  name: string
  points: number | null
  dim: number | null
}

interface VectorStatusData {
  ok: boolean
  url: string
  collections: CollectionInfo[]
  totalPoints: number
  error?: string
}

export function VectorStatusCard() {
  const [data, setData] = useState<VectorStatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/vector-status", { cache: "no-store" })
      setData(await res.json())
    } catch {
      setData({ ok: false, url: "", collections: [], totalPoints: 0, error: "네트워크 오류" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const summary = !data
    ? ""
    : data.ok
      ? `${data.collections.length}개 컬렉션 · ${data.totalPoints.toLocaleString()}pt`
      : `연결 실패${data.error ? ` — ${data.error}` : ""}`

  return (
    <div className="shrink-0 border-b border-border">
      <div
        className="flex items-center gap-2 px-4 py-1.5 hover:bg-accent/20 transition-colors cursor-pointer"
        onClick={() => data && setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" && data) setExpanded((v) => !v)
        }}
      >
        <Database size={12} className={cn("shrink-0", data?.ok === false ? "text-red-500" : "text-sky-500")} />
        <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400 shrink-0">벡터</span>
        {loading ? (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <RefreshCw size={10} className="animate-spin" /> 조회 중…
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground truncate flex-1">{summary}</span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); fetchStatus() }}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={10} />
        </button>
        {data && (
          <span className="text-muted-foreground shrink-0">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
        )}
      </div>

      {expanded && data && (
        <div className="px-4 pb-3">
          <div className="rounded-lg bg-card border border-border p-3 text-xs">
            {data.ok ? (
              data.collections.length > 0 ? (
                <ul className="space-y-1">
                  {data.collections.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-2">
                      <span className="font-mono truncate">{c.name}</span>
                      <span className="text-muted-foreground tabular-nums shrink-0">
                        {c.points !== null ? `${c.points.toLocaleString()}pt` : "?"}
                        {c.dim !== null ? ` · ${c.dim}d` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">컬렉션 없음</p>
              )
            ) : (
              <p className="text-muted-foreground">
                {data.error ?? "Qdrant에 연결할 수 없습니다."} ({data.url || "URL 미설정"})
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
