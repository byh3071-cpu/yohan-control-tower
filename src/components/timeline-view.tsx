"use client"

import { useState, useMemo } from "react"
import { FileText, ArrowRight, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GitCommit, DecisionEntry, SessionLog } from "@/lib/types"

interface TimelineViewProps {
  changelog: GitCommit[]
  decisions: DecisionEntry[]
  sessions: SessionLog[]
  onSelectDoc: (relPath: string) => void
}

interface TimelineEvent {
  date: string
  type: "decision" | "session" | "commit"
  label: string
  detail: string
  relPath?: string
}

const TYPE_CONFIG = {
  decision: { color: "bg-green-400", ring: "ring-green-400/30", label: "결정" },
  session: { color: "bg-violet-400", ring: "ring-violet-400/30", label: "세션" },
  commit: { color: "bg-slate-400", ring: "ring-slate-400/30", label: "커밋" },
}

export function TimelineView({ changelog, decisions, sessions, onSelectDoc }: TimelineViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const events = useMemo<TimelineEvent[]>(() => {
    const all: TimelineEvent[] = []
    for (const d of decisions) {
      all.push({ date: d.date, type: "decision", label: d.title, detail: d.summary, relPath: d.relPath })
    }
    for (const s of sessions) {
      all.push({ date: s.date, type: "session", label: `세션: ${s.summary[0] ?? ""}`, detail: s.summary.slice(1).join(", ") || `${s.filesChanged}개 파일 변경` })
    }
    for (const c of changelog) {
      all.push({ date: c.date, type: "commit", label: c.message, detail: c.hash })
    }
    return all.sort((a, b) => a.date.localeCompare(b.date))
  }, [decisions, sessions, changelog])

  const dateGroups = useMemo(() => {
    const map: Record<string, { decisions: number; sessions: number; commits: number }> = {}
    for (const e of events) {
      if (!map[e.date]) map[e.date] = { decisions: 0, sessions: 0, commits: 0 }
      if (e.type === "decision") map[e.date].decisions++
      else if (e.type === "session") map[e.date].sessions++
      else map[e.date].commits++
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  const detailEvents = useMemo(() => {
    if (!selectedDate) return events.slice(-10)
    return events.filter((e) => e.date === selectedDate)
  }, [events, selectedDate])

  return (
    <div className="space-y-4">
      {/* 가로 시간축 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={14} className="text-chart-1" />
          <span className="text-xs font-medium text-muted-foreground">통합 타임라인</span>
          <div className="flex items-center gap-3 ml-auto">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={cn("w-2 h-2 rounded-full", cfg.color)} />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>

        {dateGroups.length > 0 ? (
          <div className="relative">
            {/* 가로 축 */}
            <div className="h-px bg-border absolute top-1/2 left-0 right-0 -translate-y-1/2" />
            <div className="flex items-center gap-1 overflow-x-auto pb-2 pt-2 px-1">
              {dateGroups.map(([date, counts]) => {
                const total = counts.decisions + counts.sessions + counts.commits
                const size = Math.min(12 + total * 4, 36)
                const isSelected = selectedDate === date
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : date)}
                    className="flex flex-col items-center gap-1.5 shrink-0 px-2 group"
                  >
                    <div className="flex items-end gap-px" style={{ height: 40 }}>
                      {counts.decisions > 0 && (
                        <div
                          className={cn("w-2 rounded-t bg-green-400 transition-all", isSelected && "ring-2 ring-green-400/40")}
                          style={{ height: Math.min(8 + counts.decisions * 8, 36) }}
                        />
                      )}
                      {counts.sessions > 0 && (
                        <div
                          className={cn("w-2 rounded-t bg-violet-400 transition-all", isSelected && "ring-2 ring-violet-400/40")}
                          style={{ height: Math.min(8 + counts.sessions * 8, 36) }}
                        />
                      )}
                      {counts.commits > 0 && (
                        <div
                          className={cn("w-2 rounded-t bg-slate-400 transition-all", isSelected && "ring-2 ring-slate-400/40")}
                          style={{ height: Math.min(8 + counts.commits * 4, 36) }}
                        />
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-full border-2 border-background transition-all",
                        isSelected ? "bg-primary ring-2 ring-primary/30" : "bg-border group-hover:bg-foreground/50"
                      )}
                      style={{ width: size, height: size }}
                    />
                    <span className={cn(
                      "text-[9px] whitespace-nowrap transition-colors",
                      isSelected ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {date.slice(5)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">이벤트 없음</p>
        )}
      </div>

      {/* 상세 목록 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {selectedDate ? `${selectedDate} 상세` : "최근 이벤트"}
          </span>
          {selectedDate && (
            <button type="button" onClick={() => setSelectedDate(null)} className="text-[10px] text-primary ml-auto hover:underline">
              전체 보기
            </button>
          )}
        </div>
        <div className="space-y-2">
          {detailEvents.length > 0 ? detailEvents.map((e, i) => {
            const cfg = TYPE_CONFIG[e.type]
            return (
              <button
                key={`${e.date}-${e.type}-${i}`}
                type="button"
                disabled={!e.relPath}
                onClick={() => e.relPath && onSelectDoc(e.relPath)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  e.relPath ? "hover:bg-accent/30 cursor-pointer" : "cursor-default"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", cfg.color)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", cfg.color, "text-white")}>{cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground">{e.date}</span>
                  </div>
                  <p className="text-xs font-medium mt-1 line-clamp-1">{e.label}</p>
                  {e.detail && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{e.detail}</p>}
                </div>
                {e.relPath && <ArrowRight size={12} className="shrink-0 mt-2 text-muted-foreground/40" />}
              </button>
            )
          }) : (
            <p className="text-xs text-muted-foreground text-center py-6">이벤트 없음</p>
          )}
        </div>
      </div>
    </div>
  )
}
