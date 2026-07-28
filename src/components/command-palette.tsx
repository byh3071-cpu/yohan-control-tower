"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Search, Lightbulb, Rss, Link2, Scale, Wrench, FileText,
  Globe, ArrowDownToLine, BarChart3, Play,
  Bot, RefreshCw, Sparkles,
  Library, GraduationCap, FolderKanban,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DocMeta } from "@/lib/types"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  docs: DocMeta[]
  onSelectDoc: (relPath: string) => void
  onQuickAction: (action: string) => void
}

/**
 * `/api/run` allowlist 의 부분집합 — 사람 게이트 2건(`git:sync`·`sync:notion:push`)은 뺐다.
 * 서버가 403 으로 거부하므로 띄워도 누르면 실패한다(PRD F010: 위험 명령 비노출).
 */
const ACTIONS = [
  { label: "URL 인제스트", action: "ingest:url", icon: <Globe size={14} /> },
  { label: "RSS 전체 수집", action: "ingest:all", icon: <Rss size={14} /> },
  { label: "노션 풀", action: "sync:notion:pull", icon: <ArrowDownToLine size={14} /> },
  { label: "주간 리포트", action: "report:weekly", icon: <BarChart3 size={14} /> },
  { label: "드리프트 점검", action: "check:drift", icon: <Search size={14} /> },
  { label: "메모리 검색", action: "search:memory", icon: <Search size={14} /> },
  { label: "배치 즉시 실행", action: "automation:batch", icon: <Play size={14} /> },
  { label: "봇 상태", action: "bot:status", icon: <Bot size={14} /> },
  { label: "MCP 빌드", action: "build", icon: <RefreshCw size={14} /> },
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

/** `/api/search` 응답. `method` = `ai` | `keyword` | `keyword-fallback`. */
type AiSearch = { results: DocMeta[]; method: string } | null

/**
 * ⌘K 팔레트 — 문서 찾기와 명령 실행 두 가지만 한다.
 *
 * 자연어 의도 파싱(`/api/nlp-command`)은 제거했다. 뷰 전환은 탭 클릭이 더 빠르고,
 * 자연어로 명령을 실행하는 건 오분류 한 번이 곧 실행이라 사람 게이트와 충돌한다.
 * 남은 AI 몫은 검색 하나 — 키워드가 못 찾을 때 Enter 로 `/api/search` 를 친다.
 */
export function CommandPalette({ open, onOpenChange, docs, onSelectDoc, onQuickAction }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [ai, setAi] = useState<AiSearch>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // 닫힐 때의 상태 초기화는 effect 가 아니라 부모의 `key` 리마운트가 한다
  // (`app/page.tsx` 의 `key={cmdOpen ? ...}`). effect 로 리셋하면 cascading render 다.

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

  const runAiSearch = useCallback(async () => {
    if (q.length < 2) return
    setAiLoading(true)
    setAi(null)
    setAiError(null)
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      // 실패를 빈 결과로 삼키지 않는다 — "못 찾음"과 "검색이 죽음"은 다른 상태다.
      if (!res.ok) throw new Error(data?.error ?? `검색 실패 (${res.status})`)
      setAi({ results: Array.isArray(data.results) ? data.results : [], method: data.method ?? "?" })
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "검색 실패")
    } finally {
      setAiLoading(false)
    }
  }, [q])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && q.length >= 2) {
      e.preventDefault()
      void runAiSearch()
    }
  }

  const hasKeywordResults = filteredActions.length > 0 || filteredDocs.length > 0
  const aiDocs = ai?.results ?? []
  const showAiHint = q.length >= 2 && filteredDocs.length === 0 && !ai && !aiLoading && !aiError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden [&>button]:hidden">
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAi(null); setAiError(null) }}
            onKeyDown={handleKeyDown}
            placeholder="문서·명령 검색… (Enter = AI 검색)"
            className="border-0 shadow-none focus-visible:ring-0 h-11 text-sm"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-[min(60vh,400px)]">
          {filteredActions.length > 0 && (
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

          {aiLoading && (
            <div className="p-4 flex items-center gap-2 justify-center">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">AI 검색 중…</span>
            </div>
          )}

          {aiError && (
            <div className="p-4 text-center">
              <p className="text-xs text-red-500">{aiError}</p>
            </div>
          )}

          {ai && aiDocs.length === 0 && !aiLoading && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              AI 검색 결과 없음 <span className="opacity-60">({ai.method})</span>
            </div>
          )}

          {aiDocs.length > 0 && (
            <div className="p-1">
              <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium flex items-center gap-1">
                <Sparkles size={10} /> AI 검색 결과
                <span className="ml-1 opacity-60">({ai?.method})</span>
              </p>
              {aiDocs.map((d) => (
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

          {showAiHint && (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">키워드 결과 없음</p>
              <button
                type="button"
                onClick={() => void runAiSearch()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Sparkles size={12} />
                AI로 &quot;{q}&quot; 검색
              </button>
            </div>
          )}

          {!hasKeywordResults && aiDocs.length === 0 && !aiLoading && !aiError && !showAiHint && q.length < 2 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              검색어를 입력하세요 · Enter로 AI 검색
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
