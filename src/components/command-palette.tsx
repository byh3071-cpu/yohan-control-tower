"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Search, Lightbulb, Rss, Link2, Scale, Wrench, FileText,
  Globe, ArrowUpFromLine, ArrowDownToLine, BarChart3, Play,
  Bot, RefreshCw, GitBranch, Sparkles,
  Library, GraduationCap, FolderKanban,
  Zap, Eye, Calendar,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DocMeta } from "@/lib/types"
import type { ViewTab } from "@/components/view-tabs"

const VIEW_LABEL: Record<ViewTab, string> = {
  home: "홈",
  charts: "차트",
  timeline: "타임라인",
  workroom: "작업실",
  constellation: "별자리",
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  docs: DocMeta[]
  onSelectDoc: (relPath: string) => void
  onQuickAction: (action: string) => void
  onChangeView?: (view: ViewTab) => void
}

const ACTIONS = [
  { label: "URL 인제스트", action: "ingest:url", icon: <Globe size={14} /> },
  { label: "RSS 전체 수집", action: "ingest:all", icon: <Rss size={14} /> },
  { label: "노션 푸시", action: "sync:notion:push", icon: <ArrowUpFromLine size={14} /> },
  { label: "노션 풀", action: "sync:notion:pull", icon: <ArrowDownToLine size={14} /> },
  { label: "주간 리포트", action: "report:weekly", icon: <BarChart3 size={14} /> },
  { label: "드리프트 점검", action: "check:drift", icon: <Search size={14} /> },
  { label: "메모리 검색", action: "search:memory", icon: <Search size={14} /> },
  { label: "배치 즉시 실행", action: "automation:batch", icon: <Play size={14} /> },
  { label: "봇 상태", action: "bot:status", icon: <Bot size={14} /> },
  { label: "MCP 빌드", action: "build", icon: <RefreshCw size={14} /> },
  { label: "Git 동기화", action: "git:sync", icon: <GitBranch size={14} /> },
]

const CAT_ICON: Record<string, React.ReactNode> = {
  insights: <Lightbulb size={14} />,
  rss: <Rss size={14} />,
  url: <Link2 size={14} />,
  wiki: <Library size={14} />,
  curriculum: <GraduationCap size={14} />,
  projects: <FolderKanban size={14} />,
  decisions: <Scale size={14} />,
  rules: <Wrench size={14} />,
  templates: <FileText size={14} />,
}

type NlpIntent =
  | { type: "search_docs"; query: string; dateFilter?: string }
  | { type: "run_action"; action: string; args?: string; confirm?: boolean }
  | { type: "open_view"; view: ViewTab }
  | { type: "unknown"; raw: string }

type NlpResult = {
  intent: NlpIntent
  results: DocMeta[]
  method: string
} | null

export function CommandPalette({ open, onOpenChange, docs, onSelectDoc, onQuickAction, onChangeView }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [nlp, setNlp] = useState<NlpResult>(null)
  const [nlpLoading, setNlpLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ action: string; label: string } | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setNlp(null)
      setConfirmAction(null)
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onOpenChange])

  const q = query.toLowerCase().trim()

  const filteredActions = useMemo(
    () => ACTIONS.filter((a) => !q || a.label.toLowerCase().includes(q)),
    [q],
  )

  const filteredDocs = useMemo(
    () =>
      docs
        .filter((d) => !q || d.title.toLowerCase().includes(q) || d.tags.some((t) => t.includes(q)))
        .slice(0, 12),
    [docs, q],
  )

  const handleNlpCommand = useCallback(async () => {
    if (!q || q.length < 2) return
    setNlpLoading(true)
    setNlp(null)
    setConfirmAction(null)
    try {
      const res = await fetch("/api/nlp-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: q }),
      })
      const data = await res.json()
      const intent = data.intent as NlpIntent | undefined

      if (intent?.type === "open_view" && onChangeView) {
        onChangeView(intent.view)
        onOpenChange(false)
        return
      }

      if (intent?.type === "run_action") {
        const label = ACTIONS.find((a) => a.action === intent.action)?.label ?? intent.action
        setConfirmAction({ action: intent.action, label })
        setNlp(data)
        return
      }

      setNlp(data)
    } catch {
      setNlp(null)
    } finally {
      setNlpLoading(false)
    }
  }, [q, onChangeView, onOpenChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && q.length >= 2) {
      e.preventDefault()
      void handleNlpCommand()
    }
  }

  const hasKeywordResults = filteredActions.length > 0 || filteredDocs.length > 0
  const nlpDocs = nlp?.results ?? []
  const nlpIntent = nlp?.intent
  const showNlpHint = q.length >= 2 && filteredDocs.length === 0 && !nlp && !nlpLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden [&>button]:hidden">
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setNlp(null); setConfirmAction(null) }}
            onKeyDown={handleKeyDown}
            placeholder="문서 검색, 명령 실행, 또는 자연어로 질문… (Enter)"
            className="border-0 shadow-none focus-visible:ring-0 h-11 text-sm"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-[min(60vh,400px)]">
          {confirmAction && (
            <div className="p-4 space-y-2 border-b border-border/60">
              <div className="flex items-center gap-2 text-sm">
                <Zap size={14} className="text-amber-500" />
                <span><strong>{confirmAction.label}</strong> 실행할까요?</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onQuickAction(confirmAction.action)
                    onOpenChange(false)
                  }}
                  className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background hover:opacity-90"
                >
                  실행
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {nlpIntent?.type === "open_view" && (
            <div className="p-3 flex items-center gap-2 text-xs text-muted-foreground border-b border-border/60">
              <Eye size={12} />
              <span>뷰 전환: <strong className="text-foreground">{VIEW_LABEL[nlpIntent.view]}</strong></span>
            </div>
          )}

          {nlpIntent?.type === "search_docs" && nlpIntent.dateFilter && (
            <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] text-muted-foreground border-b border-border/60">
              <Calendar size={10} />
              <span>날짜 필터: <strong className="text-foreground">{nlpIntent.dateFilter}</strong></span>
              {nlp?.method && <span className="ml-auto text-[9px] opacity-60">{nlp.method}</span>}
            </div>
          )}

          {filteredActions.length > 0 && !confirmAction && (
            <div className="p-1">
              <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium">빠른 실행</p>
              {filteredActions.map((a) => (
                <button
                  key={a.action}
                  onClick={() => { onQuickAction(a.action); onOpenChange(false) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          )}
          {filteredDocs.length > 0 && (
            <div className="p-1">
              <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium">문서</p>
              {filteredDocs.map((d) => (
                <button
                  key={d.relPath}
                  onClick={() => { onSelectDoc(d.relPath); onOpenChange(false) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  {CAT_ICON[d.category] ?? <FileText size={14} />}
                  <span className="flex-1 text-left truncate">{d.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{d.date}</span>
                </button>
              ))}
            </div>
          )}

          {nlpLoading && (
            <div className="p-4 flex items-center gap-2 justify-center">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">AI가 명령을 분석 중…</span>
            </div>
          )}

          {nlpDocs.length > 0 && !confirmAction && (
            <div className="p-1">
              <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium flex items-center gap-1">
                <Sparkles size={10} /> AI 검색 결과
                {nlp?.method && <span className="ml-1 opacity-60">({nlp.method})</span>}
              </p>
              {nlpDocs.map((d) => (
                <button
                  key={d.relPath}
                  onClick={() => { onSelectDoc(d.relPath); onOpenChange(false) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  {CAT_ICON[d.category] ?? <FileText size={14} />}
                  <span className="flex-1 text-left truncate">{d.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{d.date}</span>
                </button>
              ))}
            </div>
          )}

          {showNlpHint && (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">키워드 결과 없음</p>
              <button
                type="button"
                onClick={() => void handleNlpCommand()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Sparkles size={12} />
                AI로 &quot;{q}&quot; 실행
              </button>
            </div>
          )}

          {!hasKeywordResults && nlpDocs.length === 0 && !nlpLoading && !showNlpHint && !confirmAction && q.length < 2 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              검색어를 입력하세요 · Enter로 AI 자연어 명령
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
