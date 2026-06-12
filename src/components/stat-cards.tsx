"use client"

import { FileText, Scale, ArrowDownToLine, Activity, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Stats } from "@/lib/types"

interface StatCardsProps {
  stats: Stats
  collapsed?: boolean
  onToggle?: () => void
}

const CARD_THEMES = [
  { iconBg: "bg-foreground/5 dark:bg-foreground/10", iconColor: "text-foreground/70" },
  { iconBg: "bg-foreground/5 dark:bg-foreground/10", iconColor: "text-foreground/70" },
  { iconBg: "bg-foreground/5 dark:bg-foreground/10", iconColor: "text-foreground/70" },
  { iconBg: "bg-foreground/5 dark:bg-foreground/10", iconColor: "text-foreground/70" },
] as const

export function StatCards({ stats, collapsed = false, onToggle }: StatCardsProps) {
  const batchOk = stats.batchStatus === "ok"
  const cards = [
    { label: "문서", value: `${stats.totalDocs}건`, icon: <FileText size={18} />, sub: null },
    { label: "결정", value: `${stats.decisions}건`, icon: <Scale size={18} />, sub: null },
    { label: "인제스트", value: `${stats.ingests}건`, icon: <ArrowDownToLine size={18} />, sub: null },
    {
      label: "배치",
      value: batchOk ? "정상" : stats.batchStatus === "error" ? "오류" : "?",
      icon: <Activity size={18} />,
      sub: stats.batchLastRun ? `마지막: ${stats.batchLastRun}` : null,
    },
  ]

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 flex w-full max-w-full items-center gap-4 overflow-x-auto px-4 py-1.5 border-b border-border bg-background/60 hover:bg-accent/30 transition-colors text-xs text-muted-foreground"
      >
        {cards.map((c, i) => {
          const color = i === 3 ? (batchOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400") : "text-foreground/60"
          return (
            <span key={c.label} className="flex shrink-0 items-center gap-1.5">
              <span className={cn("shrink-0", color)}>{c.icon}</span>
              <span className="font-medium text-foreground">{c.value}</span>
            </span>
          )
        })}
        <ChevronDown size={12} className="ml-auto" />
      </button>
    )
  }

  return (
    <div className="shrink-0 border-b border-border/60">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3">
        {cards.map((c, i) => {
          const theme = CARD_THEMES[i]!
          const iconColor = i === 3 ? (batchOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400") : theme.iconColor
          const iconBg = i === 3 ? (batchOk ? "bg-emerald-600/10 dark:bg-emerald-400/10" : "bg-red-500/10 dark:bg-red-400/10") : theme.iconBg

          return (
            <div
              key={c.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg shrink-0", iconBg)}>
                <span className={iconColor}>{c.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{c.label}</p>
                <p className="text-base font-semibold tabular-nums tracking-tight truncate">{c.value}</p>
                {c.sub && <p className="text-[10px] text-muted-foreground truncate">{c.sub}</p>}
              </div>
            </div>
          )
        })}
      </div>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
        >
          <ChevronUp size={14} />
          <span>접기</span>
        </button>
      )}
    </div>
  )
}
