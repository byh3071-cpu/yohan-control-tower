"use client"

import { useState } from "react"
import { FileEdit, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type DraftTemplate = "insight" | "decision" | "plan"
type SaveTarget = "insights" | "decisions"

interface Props {
  onSaved?: () => void
}

export function SotDraftPanel({ onSaved }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [topic, setTopic] = useState("")
  const [context, setContext] = useState("")
  const [template, setTemplate] = useState<DraftTemplate>("insight")
  const [bodyMd, setBodyMd] = useState("")
  const [target, setTarget] = useState<SaveTarget>("insights")
  const [tagsRaw, setTagsRaw] = useState("")
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSource, setLastSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [domain, setDomain] = useState("")

  const generate = async () => {
    setError(null)
    if (!topic.trim()) {
      setError("주제를 입력하세요")
      return
    }
    setGenerating(true)
    try {
      const res = await fetch("/api/sot-draft/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          context: context.trim() || undefined,
          template,
        }),
      })
      const data = await res.json()
      if (!data.ok || typeof data.draft !== "string") {
        setError(data.error ?? "생성 실패")
        return
      }
      setBodyMd(data.draft)
      setLastSource(typeof data.source === "string" ? data.source : null)
    } catch {
      setError("네트워크 오류")
    } finally {
      setGenerating(false)
    }
  }

  const commit = async () => {
    setError(null)
    if (!topic.trim()) {
      setError("제목(주제) 필요")
      return
    }
    if (!bodyMd.trim()) {
      setError("본문을 채우거나 초안 생성을 실행하세요")
      return
    }
    setSaving(true)
    try {
      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      const res = await fetch("/api/sot-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          title: topic.trim(),
          bodyMarkdown: bodyMd,
          tags: tags.length ? tags : undefined,
          draftKind: template,
          domain: target === "insights" && domain.trim() ? domain.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? "저장 실패")
        return
      }
      onSaved?.()
      setLastSource("saved")
    } catch {
      setError("네트워크 오류")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="shrink-0 border-b border-border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-1.5 text-left transition-colors hover:bg-accent/20"
        onClick={() => setExpanded((e) => !e)}
      >
        <FileEdit size={12} className="shrink-0 text-chart-1" />
        <span className="text-[11px] font-medium text-foreground/90 shrink-0">SoT 초안</span>
        <span className="text-[11px] text-muted-foreground truncate flex-1">
          주제 → 초안 생성 → 수정 후 확정 저장
        </span>
        <span className="text-muted-foreground shrink-0">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 px-4 pb-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-0.5">
              <span className="text-[10px] text-muted-foreground">주제 (저장 시 title)</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                placeholder="한 줄 주제"
              />
            </label>
            <label className="block space-y-0.5">
              <span className="text-[10px] text-muted-foreground">템플릿</span>
              <select
                value={template}
                disabled={target === "decisions"}
                onChange={(e) => setTemplate(e.target.value as DraftTemplate)}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-60"
              >
                <option value="insight">인사이트형</option>
                <option value="decision">결정형</option>
                <option value="plan">계획형</option>
              </select>
            </label>
          </div>
          <label className="block space-y-0.5">
            <span className="text-[10px] text-muted-foreground">맥락 (선택)</span>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              className="w-full resize-y rounded-md border border-border bg-background px-2 py-1 text-xs"
              placeholder="붙여넣기·메모"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={generating}
              onClick={() => void generate()}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-accent disabled:opacity-50"
            >
              {generating && <Loader2 size={12} className="animate-spin" />}
              초안 생성
            </button>
            {lastSource && (
              <span className="text-[10px] text-muted-foreground">
                마지막: {lastSource === "saved" ? "저장됨" : lastSource}
              </span>
            )}
          </div>
          <label className="block space-y-0.5">
            <span className="text-[10px] text-muted-foreground">본문 (마크다운, 수정 가능)</span>
            <textarea
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              rows={8}
              className="w-full resize-y rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] leading-snug"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-0.5">
              <span className="text-[10px] text-muted-foreground">저장 위치</span>
              <select
                value={target}
                onChange={(e) => {
                  const v = e.target.value as SaveTarget
                  setTarget(v)
                  if (v === "decisions") setTemplate("decision")
                  if (v === "insights" && template === "decision") setTemplate("insight")
                }}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="insights">ingest/insights</option>
                <option value="decisions">decisions</option>
              </select>
            </label>
            <label className="block space-y-0.5">
              <span className="text-[10px] text-muted-foreground">태그 (쉼표 구분, 선택)</span>
              <input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                placeholder="dashboard, sot"
              />
            </label>
          </div>
          {target === "insights" && (
            <label className="block space-y-0.5">
              <span className="text-[10px] text-muted-foreground">domain (선택, 프론트매터)</span>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                placeholder="예: ai-engineering"
                maxLength={48}
              />
            </label>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void commit()}
            className={cn(
              "rounded-md bg-foreground px-3 py-1.5 text-[11px] font-medium text-background hover:opacity-90 disabled:opacity-50"
            )}
          >
            {saving ? "저장 중…" : "확정 저장"}
          </button>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
