"use client"

import { useState, useEffect } from "react"
import { Sun, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface BriefingData {
  date: string
  briefing: string
}

export function BriefingCard() {
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchBriefing = async (refresh = false) => {
    setLoading(true)
    try {
      const url = refresh ? "/api/briefing?refresh=1" : "/api/briefing"
      const res = await fetch(url)
      if (!res.ok) return
      setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBriefing(false) }, [])

  const firstLine = data?.briefing?.split("\n").find((l) => l.trim().length > 5)?.replace(/^[#*\-\d.]+\s*/, "").trim() ?? ""

  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex items-center gap-2 px-4 py-1.5 hover:bg-accent/20 transition-colors cursor-pointer"
        onClick={() => data && setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" && data) setExpanded((v) => !v)
        }}
      >
        <Sun size={12} className="text-amber-500 shrink-0" />
        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 shrink-0">브리핑</span>
        {loading ? (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <RefreshCw size={10} className="animate-spin" /> 생성 중…
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground truncate flex-1">{firstLine}</span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); fetchBriefing(true) }}
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
          <div className="rounded-lg bg-card border border-border p-3 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_p]:text-xs [&_li]:text-xs [&_strong]:text-foreground [&_ol]:pl-4 [&_ul]:pl-4">
            <ReactMarkdown>{data.briefing}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
