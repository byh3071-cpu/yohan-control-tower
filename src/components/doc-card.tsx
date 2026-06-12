"use client"

import { Badge } from "@/components/ui/badge"
import type { DocMeta } from "@/lib/types"

type TagStyle = { bg: string; text: string; border: string }

const PALETTE: Record<string, TagStyle> = {
  purple:  { bg: "bg-purple-100 dark:bg-purple-500/25",  text: "text-purple-700 dark:text-purple-300",  border: "border-purple-300 dark:border-purple-500/40" },
  blue:    { bg: "bg-blue-100 dark:bg-blue-500/25",      text: "text-blue-700 dark:text-blue-300",      border: "border-blue-300 dark:border-blue-500/40" },
  green:   { bg: "bg-green-100 dark:bg-green-500/25",    text: "text-green-700 dark:text-green-300",    border: "border-green-300 dark:border-green-500/40" },
  orange:  { bg: "bg-orange-100 dark:bg-orange-500/25",  text: "text-orange-700 dark:text-orange-300",  border: "border-orange-300 dark:border-orange-500/40" },
  indigo:  { bg: "bg-indigo-100 dark:bg-indigo-500/25",  text: "text-indigo-700 dark:text-indigo-300",  border: "border-indigo-300 dark:border-indigo-500/40" },
  yellow:  { bg: "bg-yellow-100 dark:bg-yellow-500/25",  text: "text-yellow-700 dark:text-yellow-300",  border: "border-yellow-300 dark:border-yellow-500/40" },
  slate:   { bg: "bg-slate-200 dark:bg-slate-500/25",    text: "text-slate-700 dark:text-slate-300",    border: "border-slate-300 dark:border-slate-400/40" },
  sky:     { bg: "bg-sky-100 dark:bg-sky-500/25",        text: "text-sky-700 dark:text-sky-300",        border: "border-sky-300 dark:border-sky-500/40" },
  neutral: { bg: "bg-neutral-200 dark:bg-neutral-500/25",text: "text-neutral-700 dark:text-neutral-300",border: "border-neutral-300 dark:border-neutral-400/40" },
  violet:  { bg: "bg-violet-100 dark:bg-violet-500/25",  text: "text-violet-700 dark:text-violet-300",  border: "border-violet-300 dark:border-violet-500/40" },
  teal:    { bg: "bg-teal-100 dark:bg-teal-500/25",      text: "text-teal-700 dark:text-teal-300",      border: "border-teal-300 dark:border-teal-500/40" },
  amber:   { bg: "bg-amber-100 dark:bg-amber-500/25",    text: "text-amber-700 dark:text-amber-300",    border: "border-amber-300 dark:border-amber-500/40" },
  cyan:    { bg: "bg-cyan-100 dark:bg-cyan-500/25",      text: "text-cyan-700 dark:text-cyan-300",      border: "border-cyan-300 dark:border-cyan-500/40" },
  pink:    { bg: "bg-pink-100 dark:bg-pink-500/25",      text: "text-pink-700 dark:text-pink-300",      border: "border-pink-300 dark:border-pink-500/40" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-500/25",text: "text-emerald-700 dark:text-emerald-300",border: "border-emerald-300 dark:border-emerald-500/40" },
  fuchsia: { bg: "bg-fuchsia-100 dark:bg-fuchsia-500/25",text: "text-fuchsia-700 dark:text-fuchsia-300",border: "border-fuchsia-300 dark:border-fuchsia-500/40" },
  lime:    { bg: "bg-lime-100 dark:bg-lime-500/25",      text: "text-lime-700 dark:text-lime-300",      border: "border-lime-300 dark:border-lime-500/40" },
  rose:    { bg: "bg-rose-100 dark:bg-rose-500/25",      text: "text-rose-700 dark:text-rose-300",      border: "border-rose-300 dark:border-rose-500/40" },
  red:     { bg: "bg-red-100 dark:bg-red-500/25",        text: "text-red-700 dark:text-red-300",        border: "border-red-300 dark:border-red-500/40" },
}

function p(color: string) {
  const s = PALETTE[color] ?? PALETTE.slate!
  return `${s.bg} ${s.text} ${s.border}`
}

const TAG_COLORS: Record<string, string> = {
  automation: p("purple"),
  harness: p("blue"),
  decisions: p("green"),
  operations: p("orange"),
  rss: p("indigo"),
  plan: p("yellow"),
  github: p("slate"),
  telegram: p("sky"),
  notion: p("neutral"),
  obsidian: p("violet"),
  "context-engineering": p("teal"),
  ocr: p("amber"),
  "OCR-telegram": p("amber"),
  pipeline: p("cyan"),
  ui: p("pink"),
  dashboard: p("pink"),
  guide: p("emerald"),
  "vibe-coding": p("fuchsia"),
  SoT: p("lime"),
  mcp: p("rose"),
  daily: p("blue"),
  router: p("orange"),
  planning: p("yellow"),
  cursor: p("indigo"),
  checklist: p("emerald"),
  runbook: p("cyan"),
  troubleshooting: p("red"),
}

function tagColor(tag: string): string {
  return TAG_COLORS[tag] ?? p("slate")
}

interface DocCardProps {
  doc: DocMeta
  isActive: boolean
  onClick: () => void
}

export function DocCard({ doc, isActive, onClick }: DocCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isActive
          ? "border-foreground/20 bg-accent"
          : "border-border hover:bg-accent/50"
      }`}
    >
      <h3 className="text-sm font-medium leading-snug line-clamp-2 mb-1.5">
        {doc.title}
      </h3>
      {doc.date && (
        <p className="text-[11px] text-muted-foreground mb-2">{doc.date}</p>
      )}
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {doc.tags.slice(0, 4).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className={`text-[10px] font-medium px-1.5 py-0 h-5 leading-tight ${tagColor(t)}`}
            >
              {t}
            </Badge>
          ))}
          {doc.tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{doc.tags.length - 4}</span>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {doc.excerpt}
      </p>
    </button>
  )
}
