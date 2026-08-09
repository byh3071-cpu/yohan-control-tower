"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw } from "lucide-react"

import type { KnowledgeReviewDecision, KnowledgeReviewItem } from "@/lib/types"

const REVIEW_NOTE_MAX_CHARS = 4_000
const DECISIONS: Array<{ value: KnowledgeReviewDecision; label: string }> = [
  { value: "approve", label: "승인" },
  { value: "approve_after_edit", label: "메모와 함께 승인" },
  { value: "hold", label: "보류" },
  { value: "reject", label: "거절" },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function KnowledgeReviewPanel() {
  const [items, setItems] = useState<KnowledgeReviewItem[] | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch("/api/knowledge-review", { cache: "no-store" })
      const raw = await response.text()
      const value: unknown = raw ? JSON.parse(raw) : {}
      if (!response.ok || !isRecord(value) || !Array.isArray(value.items)) {
        throw new Error(isRecord(value) && typeof value.error === "string" ? value.error : "검토 항목을 불러오지 못했습니다.")
      }
      setItems(value.items as KnowledgeReviewItem[])
    } catch (refreshError) {
      setItems(null)
      setError(refreshError instanceof Error ? refreshError.message : "검토 항목을 불러오지 못했습니다.")
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const decide = async (item: KnowledgeReviewItem, decision: KnowledgeReviewDecision) => {
    if (pending) return
    setPending(item.id)
    setError(null)
    setMessage(null)
    try {
      const note = notes[item.id]?.trim()
      const response = await fetch("/api/knowledge-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, decision, ...(note ? { note } : {}) }),
      })
      const raw = await response.text()
      const value: unknown = raw ? JSON.parse(raw) : {}
      if (response.status === 409) {
        setMessage("이미 처리된 항목입니다. 최신 상태를 다시 불러왔습니다.")
      } else if (!response.ok) {
        throw new Error(isRecord(value) && typeof value.error === "string" ? value.error : "결정을 저장하지 못했습니다.")
      } else {
        setMessage(`${DECISIONS.find((entry) => entry.value === decision)?.label ?? "결정"}했습니다.`)
      }
      await refresh()
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "결정을 저장하지 못했습니다.")
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card/40 p-4" aria-labelledby="knowledge-review-title">
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="knowledge-review-title" className="text-sm font-semibold">Focus Feed 지식 검토</h2>
          <p className="text-[11px] leading-relaxed text-muted-foreground">원본·NotebookLM source·요약을 확인하고 사람 결정을 기록하세요.</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
          <RefreshCw size={12} /> 새로고침
        </button>
      </div>
      {message && <p className="mb-3 flex gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-[11px] text-emerald-700 dark:text-emerald-300" aria-live="polite"><CheckCircle2 size={13} />{message}</p>}
      {error && <p className="mb-3 flex gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-800 dark:text-amber-200" role="alert"><AlertTriangle size={13} />{error}</p>}
      {items === null && !error ? <div className="flex justify-center py-8 text-xs text-muted-foreground"><Loader2 size={14} className="mr-2 animate-spin" />불러오는 중</div> : null}
      {items?.length === 0 ? <div className="rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 py-8 text-center text-sm"><CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={22} />검토가 필요한 Focus Feed 항목이 없습니다.</div> : null}
      <div className="space-y-2">
        {items?.map((item) => {
          const open = expanded === item.id
          const evidenceReady = item.claims.length > 0 && item.claims.every((claim) => Boolean(claim.timestamp))
          const note = notes[item.id]?.trim() ?? ""
          return <article key={item.id} className="rounded-lg border border-border bg-background/70">
            <button type="button" onClick={() => setExpanded(open ? null : item.id)} aria-expanded={open} className="min-h-11 w-full px-3 py-2.5 text-left hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring">
              <span className="block truncate text-xs font-medium">{item.title}</span>
              <span className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground"><span className="rounded bg-muted px-1.5 py-0.5">{item.category}</span>{item.qualityWarnings.length > 0 && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-800 dark:text-amber-200">품질 경고 {item.qualityWarnings.length}</span>}</span>
            </button>
            {open && <div className="space-y-3 border-t border-border px-3 py-3 text-[11px] leading-relaxed">
              <div className="flex flex-wrap items-center gap-2">
                <a href={item.originalUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-md border border-border px-3 text-blue-700 hover:bg-accent hover:underline dark:text-blue-300"><ExternalLink size={14} /><span className="truncate">원본 영상 열기</span></a>
                {item.notebookLmSource && <details className="text-muted-foreground"><summary className="cursor-pointer py-2 text-[10px]">NotebookLM 원문 연결됨</summary><p className="max-w-full break-all rounded bg-muted px-2 py-1 font-mono text-[9px]">{item.notebookLmSource}</p></details>}
              </div>
              <p><span className="font-medium">요약: </span>{item.summary}</p>
              <div><p className="font-medium">주장과 타임스탬프</p>{item.claims.length ? <ul className="mt-1 list-disc space-y-1 pl-4">{item.claims.map((claim, index) => <li key={`${claim.claim}-${index}`}>{claim.claim}{claim.timestamp ? <span className="text-muted-foreground"> · {claim.timestamp}</span> : null}</li>)}</ul> : <p className="text-muted-foreground">추출된 주장이 없습니다.</p>}</div>
              {!evidenceReady && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-red-800 dark:text-red-200"><p className="font-medium">승인할 수 없는 근거 상태</p><p>모든 주장에 검증된 타임스탬프가 있어야 승인할 수 있습니다. 보류 또는 거절은 가능합니다.</p></div>}
              {item.qualityWarnings.length > 0 && <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-amber-900 dark:text-amber-100"><p className="font-medium">품질 경고</p><ul className="list-disc pl-4">{item.qualityWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
              <label className="block"><span className="text-[10px] font-medium">승인 메모 (선택)</span><textarea value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={REVIEW_NOTE_MAX_CHARS} rows={2} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" /></label>
              <div className="sticky bottom-0 z-10 -mx-3 -mb-3 flex flex-wrap gap-2 border-t border-border bg-background/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/85">{DECISIONS.map((entry) => {
                const approval = entry.value === "approve" || entry.value === "approve_after_edit"
                const disabled = pending !== null || (approval && !evidenceReady) || (entry.value === "approve_after_edit" && !note)
                return <button key={entry.value} type="button" disabled={disabled} onClick={() => void decide(item, entry.value)} className="min-h-11 flex-1 rounded-md border border-border px-3 py-2 text-[11px] font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring">{pending === item.id ? <Loader2 size={13} className="mx-auto animate-spin" /> : entry.label}</button>
              })}</div>
            </div>}
          </article>
        })}
      </div>
    </section>
  )
}
