"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, useMemo, useCallback, useDeferredValue } from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { StatCards } from "@/components/stat-cards"
import { DocCard } from "@/components/doc-card"
import { DocPreview } from "@/components/doc-preview"
import { CommandPalette } from "@/components/command-palette"
import { ViewTabs, type ViewTab } from "@/components/view-tabs"
import { SerendipityCard } from "@/components/serendipity-card"
// MiniCharts removed from home — charts live in chart tab only
import { BriefingCard } from "@/components/briefing-card"
import { SotDraftPanel } from "@/components/sot-draft-panel"
import { FullCharts } from "@/components/full-charts"
import { TimelineView } from "@/components/timeline-view"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { DocMeta, DocCategory, Stats, ChartData, SerendipityDoc, GitCommit, DecisionEntry, SessionLog } from "@/lib/types"
import {
  type ConstellationData,
  filterConstellationAtDate,
  ymdToDayKey,
  dayKeyToYmd,
} from "@/lib/constellation"

const ConstellationCanvas = dynamic(
  () =>
    import("@/components/constellation-view").then((m) => m.ConstellationView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        별자리 뷰 로드 중…
      </div>
    ),
  }
)

const GraphView2DCanvas = dynamic(
  () => import("@/components/graph-view-2d").then((m) => m.GraphView2D),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        그래프 뷰 로드 중…
      </div>
    ),
  }
)

const CAT_LABEL: Record<string, string> = {
  all: "전체",
  insights: "인사이트",
  rss: "RSS",
  url: "URL",
  wiki: "위키",
  curriculum: "교재",
  projects: "프로젝트",
  decisions: "결정로그",
  rules: "규칙",
  templates: "템플릿",
}

export default function DashboardPage() {
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [stats, setStats] = useState<Stats>({
    totalDocs: 0,
    decisions: 0,
    ingests: 0,
    batchStatus: "unknown",
    batchLastRun: null,
  })
  const [charts, setCharts] = useState<ChartData>({
    ingestTrend: [],
    domainDist: [],
    categoryDist: [],
    sourceDist: [],
    batchHistory: [],
    activity: [],
    decisionHistory: [],
    heatmap: [],
    evaluatorRollup: null,
  })
  const [serendipity, setSerendipity] = useState<SerendipityDoc | null>(null)
  const [changelog, setChangelog] = useState<GitCommit[]>([])
  const [decisionEntries, setDecisionEntries] = useState<DecisionEntry[]>([])
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([])
  const [activeCategory, setActiveCategory] = useState<DocCategory | "all">("all")
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewTab>("home")
  const [cmdOpen, setCmdOpen] = useState(false)
  const [statsCollapsed, setStatsCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [constellationData, setConstellationData] = useState<ConstellationData | null>(null)
  const [constellationAsOfYmd, setConstellationAsOfYmd] = useState<string | null>(null)
  const [constellationHubGravity, setConstellationHubGravity] = useState(false)
  const [constellationNebula, setConstellationNebula] = useState(true)
  const [constellationMode, setConstellationMode] = useState<"2d" | "3d">("2d")

  const loadDashboard = useCallback(async (fresh = false) => {
    const url = fresh ? `/api/docs?fresh=1&t=${Date.now()}` : `/api/docs?t=${Date.now()}`
    try {
      const r = await fetch(url, { cache: "no-store" })
      const data = await r.json()
      setDocs(data.docs ?? [])
      setStats((prev) => data.stats ?? prev)
      setCharts(
        data.charts ?? {
          ingestTrend: [],
          domainDist: [],
          categoryDist: [],
          sourceDist: [],
          batchHistory: [],
          activity: [],
          decisionHistory: [],
          heatmap: [],
          evaluatorRollup: null,
        }
      )
      setSerendipity(data.serendipity ?? null)
      setChangelog(data.changelog ?? [])
      setDecisionEntries(data.decisions ?? [])
      setSessionLogs(data.sessions ?? [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    loadDashboard(true).finally(() => setLoading(false))
  }, [loadDashboard])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (activeView !== "constellation" || constellationData) return
    fetch(`/api/constellation?fresh=1&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: ConstellationData) => {
        setConstellationData(data)
        if (data.timeRange?.dateMin && data.timeRange?.dateMax) {
          setConstellationAsOfYmd((prev) => prev ?? data.timeRange.dateMax!)
        }
      })
      .catch(console.error)
  }, [activeView, constellationData])

  const deferredConstellationAsOf = useDeferredValue(constellationAsOfYmd)

  const constellationViewData = useMemo(() => {
    if (!constellationData || !deferredConstellationAsOf) return constellationData
    const { dateMin, dateMax } = constellationData.timeRange
    if (!dateMin || !dateMax) return constellationData
    return filterConstellationAtDate(constellationData, deferredConstellationAsOf)
  }, [constellationData, deferredConstellationAsOf])

  useEffect(() => {
    if (activeView !== "constellation" || !constellationViewData || !selectedDoc) return
    if (!constellationViewData.nodes.some((n) => n.relPath === selectedDoc)) {
      setSelectedDoc(null)
    }
  }, [activeView, constellationViewData, selectedDoc])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: docs.length }
    for (const d of docs) {
      map[d.category] = (map[d.category] ?? 0) + 1
    }
    return map
  }, [docs])

  const filtered = useMemo(() => {
    if (activeCategory === "all") return docs
    return docs.filter((d) => d.category === activeCategory)
  }, [docs, activeCategory])

  useEffect(() => {
    if (!selectedDoc) return
    if (!filtered.some((d) => d.relPath === selectedDoc)) setSelectedDoc(null)
  }, [filtered, selectedDoc])

  const [actionResult, setActionResult] = useState<{ action: string; ok: boolean; message: string } | null>(null)
  const [actionRunning, setActionRunning] = useState<string | null>(null)

  const runServerAction = useCallback(async (action: string, args?: string) => {
    setActionRunning(action)
    setActionResult(null)
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, args }),
      })
      const data = await res.json()
      setActionResult({
        action,
        ok: data.ok,
        message: data.ok
          ? `✅ ${action} 완료\n${(data.stdout ?? "").slice(0, 200)}`
          : `❌ ${action} 실패\n${data.error ?? ""}\n${(data.stderr ?? "").slice(0, 200)}`,
      })
    } catch {
      setActionResult({ action, ok: false, message: "❌ 네트워크 오류" })
    } finally {
      setActionRunning(null)
    }
  }, [])

  const handleQuickAction = useCallback(async (action: string) => {
    if (action === "ingest:url") {
      const url = window.prompt("인제스트할 URL을 입력하세요:")
      if (!url?.trim()) return
      return runServerAction(action, url.trim())
    }

    if (action === "search:memory") {
      setCmdOpen(true)
      return
    }

    return runServerAction(action)
  }, [runServerAction])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center animate-pulse">
            <span className="text-background font-bold text-lg">Y</span>
          </div>
          <p className="text-sm text-muted-foreground">로딩 중…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onOpenSearch={() => setCmdOpen(true)} onOpenMobileNav={() => setMobileNavOpen(true)} />
      <StatCards
        stats={stats}
        collapsed={statsCollapsed || !!selectedDoc}
        onToggle={() => setStatsCollapsed((c) => !c)}
      />
      <ViewTabs active={activeView} onChange={setActiveView} />

      <div className="relative flex flex-1 overflow-hidden">
        <button
          type="button"
          aria-label="메뉴 닫기"
          className={cn(
            "fixed left-0 right-0 top-12 bottom-0 z-[35] bg-black/40 transition-opacity md:hidden",
            mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setMobileNavOpen(false)}
        />
        <div
          className={cn(
            "z-[40] flex h-full shrink-0 transition-transform duration-200 ease-out max-md:shadow-2xl",
            "fixed left-0 top-12 bottom-0 md:relative md:top-auto md:bottom-auto md:shadow-none md:transition-none",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <Sidebar
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            counts={counts}
            onQuickAction={handleQuickAction}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {activeView === "home" && !selectedDoc && (
            <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border/60">
              <SerendipityCard doc={serendipity} onSelect={(p) => { setSelectedDoc(p); setMobileNavOpen(false) }} />
            </div>
          )}
          {activeView === "workroom" && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="mx-auto max-w-3xl space-y-1 p-3">
                <BriefingCard />
                <SotDraftPanel onSaved={() => void loadDashboard(true)} />
              </div>
            </ScrollArea>
          )}

          {activeView === "charts" && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4">
                <FullCharts data={charts} />
              </div>
            </ScrollArea>
          )}

          {activeView === "timeline" && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4">
                <TimelineView
                  changelog={changelog}
                  decisions={decisionEntries}
                  sessions={sessionLogs}
                  onSelectDoc={(p) => { setSelectedDoc(p); setActiveView("home"); setMobileNavOpen(false) }}
                />
              </div>
            </ScrollArea>
          )}

          {activeView === "constellation" && (
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden md:flex-row">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col border-border md:border-r">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-md border border-border p-0.5">
                      {(["2d", "3d"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setConstellationMode(m)}
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                            constellationMode === m
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {m === "2d" ? "그래프 2D" : "은하 3D"}
                        </button>
                      ))}
                    </div>
                    <p className="hidden text-[11px] text-muted-foreground sm:block">
                      {constellationMode === "2d"
                        ? "옵시디언식 그래프 · 노드 드래그 · 휠 줌 · 더블클릭 화면 맞춤 · 클릭 → 미리보기"
                        : "사이드바 카테고리로 은하 필터 · 드래그 회전 · 휠 줌 · 별 클릭 → 미리보기"}
                    </p>
                  </div>
                  {constellationMode === "3d" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-[10px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-border accent-foreground"
                          checked={constellationHubGravity}
                          onChange={(e) => setConstellationHubGravity(e.target.checked)}
                        />
                        허브 중력
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-[10px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-border accent-foreground"
                          checked={constellationNebula}
                          onChange={(e) => setConstellationNebula(e.target.checked)}
                        />
                        성운
                      </label>
                    </div>
                  )}
                </div>
                {constellationData?.timeRange.dateMin &&
                  constellationData.timeRange.dateMax &&
                  constellationAsOfYmd && (
                    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 px-3 py-2">
                      <span className="text-[10px] font-medium text-muted-foreground">시점</span>
                      <input
                        type="range"
                        aria-label="별자리 시점(as-of 날짜)"
                        className="h-1.5 min-w-[120px] flex-1 cursor-pointer accent-foreground"
                        min={ymdToDayKey(constellationData.timeRange.dateMin) ?? 0}
                        max={ymdToDayKey(constellationData.timeRange.dateMax) ?? 0}
                        value={ymdToDayKey(constellationAsOfYmd) ?? 0}
                        onChange={(e) => setConstellationAsOfYmd(dayKeyToYmd(Number(e.target.value)))}
                      />
                      <span className="text-[11px] tabular-nums text-foreground">
                        {constellationAsOfYmd}
                      </span>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() =>
                          constellationData.timeRange.dateMax &&
                          setConstellationAsOfYmd(constellationData.timeRange.dateMax)
                        }
                      >
                        최신
                      </button>
                    </div>
                  )}
                <div className="min-h-0 flex-1 bg-background">
                  {constellationViewData ? (
                    constellationMode === "2d" ? (
                      <GraphView2DCanvas
                        data={constellationViewData}
                        filterCategory={activeCategory}
                        selectedRelPath={selectedDoc}
                        onSelectDoc={(p) => { setSelectedDoc(p); setMobileNavOpen(false) }}
                        className="h-full min-h-[320px] w-full"
                      />
                    ) : (
                    <ConstellationCanvas
                      data={constellationViewData}
                      filterCategory={activeCategory}
                      selectedRelPath={selectedDoc}
                      onSelectDoc={(p) => { setSelectedDoc(p); setMobileNavOpen(false) }}
                      asOfYmd={constellationAsOfYmd}
                      hubGravity={constellationHubGravity}
                      nebula={constellationNebula}
                      className="h-full min-h-[320px] w-full"
                    />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      그래프 준비 중…
                    </div>
                  )}
                </div>
              </div>
              <DocPreview
                relPath={selectedDoc}
                onClose={() => setSelectedDoc(null)}
                fullscreenMobile
              />
            </div>
          )}

          {activeView === "home" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
              <ScrollArea className="h-full min-h-0 w-full shrink-0 border-border md:w-80 md:border-r">
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {CAT_LABEL[activeCategory] ?? activeCategory} · {filtered.length}건
                    </p>
                  </div>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">문서가 없습니다</p>
                  ) : (
                    filtered.map((d) => (
                      <DocCard
                        key={d.relPath}
                        doc={d}
                        isActive={selectedDoc === d.relPath}
                        onClick={() => {
                          setSelectedDoc(d.relPath)
                          setMobileNavOpen(false)
                        }}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
              <DocPreview
                relPath={selectedDoc}
                onClose={() => setSelectedDoc(null)}
                fullscreenMobile
              />
            </div>
          )}
        </div>
      </div>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        docs={docs}
        onSelectDoc={(p) => { setSelectedDoc(p); setMobileNavOpen(false) }}
        onQuickAction={handleQuickAction}
        onChangeView={setActiveView}
      />

      {actionRunning && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg px-4 py-3 shadow-lg z-50 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          <span className="text-sm">{actionRunning} 실행 중…</span>
        </div>
      )}

      {actionResult && !actionRunning && (
        <button
          onClick={() => setActionResult(null)}
          className="fixed bottom-4 right-4 bg-card border border-border rounded-lg px-4 py-3 shadow-lg z-50 max-w-sm text-left cursor-pointer hover:bg-accent transition-colors"
        >
          <pre className="text-xs whitespace-pre-wrap">{actionResult.message}</pre>
          <p className="text-[10px] text-muted-foreground mt-1">클릭하면 닫힘</p>
        </button>
      )}
    </div>
  )
}
