"use client"

import { useState, useEffect, useCallback } from "react"
import { Moon, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"

interface OvernightSummary {
  file: string
  date: string | null
  title: string
  conclusion: string[]
}

interface DeferredQueue {
  savedAt: string | null
  count: number
  bySeverity: Record<string, number>
  byRepo: Record<string, number>
}

interface OvernightStatusData {
  ok: boolean
  summaries: OvernightSummary[]
  deferred: DeferredQueue
  error?: string
}

function formatCounts(rec: Record<string, number>): string {
  return Object.entries(rec)
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ")
}

export function OvernightStatusCard() {
  const [data, setData] = useState<OvernightStatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/overnight-status", { cache: "no-store" })
      setData(await res.json())
    } catch {
      setData({
        ok: false,
        summaries: [],
        deferred: { savedAt: null, count: 0, bySeverity: {}, byRepo: {} },
        error: "네트워크 오류",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const latest = data?.summaries[0]
  const summary = !data
    ? ""
    : data.ok
      ? latest
        ? `${latest.date ?? latest.file} · 이월 ${data.deferred.count}건`
        : `보고 없음 · 이월 ${data.deferred.count}건`
      : `읽기 실패${data.error ? ` — ${data.error}` : ""}`

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
        <Moon size={12} className="text-violet-500 shrink-0" />
        <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400 shrink-0">밤루프</span>
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
        <div className="px-4 pb-3 space-y-2">
          {data.ok ? (
            <>
              {data.summaries.length === 0 && (
                <div className="rounded-lg bg-card border border-border p-3 text-xs text-muted-foreground">
                  밤루프 보고 없음
                </div>
              )}
              {data.summaries.map((s) => (
                <div key={s.file} className="rounded-lg bg-card border border-border p-3 text-xs">
                  <p className="font-medium mb-1">
                    {s.date ?? s.file} — {s.title}
                  </p>
                  {s.conclusion.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      {s.conclusion.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">결론 섹션 없음</p>
                  )}
                </div>
              ))}
              <div className="rounded-lg bg-card border border-border p-3 text-xs">
                <p className="font-medium mb-1">
                  이월 큐 — {data.deferred.count}건{data.deferred.savedAt ? ` (${data.deferred.savedAt})` : ""}
                </p>
                {data.deferred.count > 0 ? (
                  <p className="text-muted-foreground">
                    {formatCounts(data.deferred.bySeverity)}
                    {" — "}
                    {formatCounts(data.deferred.byRepo)}
                  </p>
                ) : (
                  <p className="text-muted-foreground">이월 없음</p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-card border border-border p-3 text-xs text-muted-foreground">
              {data.error ?? "밤루프 감사 로그를 읽을 수 없습니다."}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
