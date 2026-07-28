"use client"

import { useState, useEffect, useCallback } from "react"
import { Newspaper, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface PublishItem {
  slug: string
  title: string
  published: boolean
  date: string | null
}

interface PublishStatusData {
  ok: boolean
  /** false = 읽지 못함(레포 부재 등). true 인데 total 0 = 진짜 글 0편. 둘을 구별한다. */
  available: boolean
  total?: number
  published?: number
  draft?: number
  latest?: PublishItem[]
  error?: string
}

export function PublishStatusCard() {
  const [data, setData] = useState<PublishStatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/publish-status", { cache: "no-store" })
      setData(await res.json())
    } catch {
      setData({ ok: false, available: false, error: "네트워크 오류" })
    } finally {
      setLoading(false)
    }
  }, [])

  // setState 는 타이머 콜백 안에서만 — effect 본문 동기 호출은 cascading render 로 잡힌다
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    const t = setTimeout(() => void fetchStatus(), 0)
    return () => clearTimeout(t)
  }, [fetchStatus])

  // "읽지 못함"과 "글 0편"을 절대 같은 문구로 보여주지 않는다 — 그 둘이 섞이면
  // 레포가 사라진 것도 정상으로 읽힌다(§6-⑤).
  const summary = !data
    ? ""
    : !data.available
      ? `읽지 못함${data.error ? ` — ${data.error}` : ""}`
      : (data.total ?? 0) > 0
        ? `${data.total}건 · 발행 ${data.published} · 초안 ${data.draft}`
        : "글 0편"

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
        <Newspaper size={12} className="text-emerald-500 shrink-0" />
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">발행</span>
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
            {data.available && (data.latest?.length ?? 0) > 0 ? (
              <ul className="space-y-1">
                {data.latest?.map((item) => (
                  <li key={item.slug} className="flex items-center justify-between gap-2">
                    <span className="truncate">{item.title}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                        item.published
                          ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.published ? "발행" : "초안"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                {data.error ?? "발행 콘텐츠가 없거나 형제 레포에 접근할 수 없습니다."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
