"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, useMemo, useCallback, useDeferredValue } from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { DocCard } from "@/components/doc-card"
import { DocPreview } from "@/components/doc-preview"
import { CommandPalette } from "@/components/command-palette"
import { ViewTabs, type ViewTab } from "@/components/view-tabs"
import { OvernightStatusCard } from "@/components/overnight-status-card"
import { PublishStatusCard } from "@/components/publish-status-card"
import { YohanInboxPanel } from "@/components/yohan-inbox-panel"
import { FullCharts } from "@/components/full-charts"
import { TimelineView } from "@/components/timeline-view"
import { TableView } from "@/components/table-view"
import { HomeView } from "@/components/home-view"
import { ProjectView } from "@/components/project-view"
import { VectorPanel } from "@/components/vector/VectorPanel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { countByScope, docScope, matchesFilter, type DocFilter } from "@/lib/doc-scope"
import { cn } from "@/lib/utils"
import type { DocMeta, Stats, ChartData, GitCommit, DecisionEntry, SessionLog } from "@/lib/types"
import {
  type ConstellationData,
  filterConstellationAtDate,
  ymdToDayKey,
  dayKeyToYmd,
} from "@/lib/constellation"

const ConstellationCanvas = dynamic(
  () => import("@/components/constellation-view").then((m) => m.ConstellationView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        은하 뷰 로드 중…
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
  managed: "작성",
  collected: "수집",
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

/** 문서 탭의 표시 모드. 관계 뷰는 **탭이 아니라 모드**다 — 탭 상한 5를 지키면서 기능을 보존한다. */
type DocsMode = "card" | "table" | "graph"

const DOCS_MODES: { id: DocsMode; label: string }[] = [
  { id: "card", label: "카드" },
  { id: "table", label: "표" },
  { id: "graph", label: "관계" },
]

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
  const [changelog, setChangelog] = useState<GitCommit[]>([])
  const [decisionEntries, setDecisionEntries] = useState<DecisionEntry[]>([])
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([])
  const [activeCategory, setActiveCategory] = useState<DocFilter>("all")
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewTab>("home")
  const [projectMission, setProjectMission] = useState<string | null>(null)
  const [docsMode, setDocsMode] = useState<DocsMode>("card")
  const [inboxOpen, setInboxOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
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
      const raw = await r.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!r.ok) {
        const message = typeof data.error === "string" ? data.error : `HTTP ${r.status}`
        if (data.setupRequired === true) {
          setDashboardError(message)
          return
        }
        throw new Error(message)
      }
      setDocs(data.docs ?? [])
      setStats((prev) => data.stats ?? prev)
      setCharts((prev) => data.charts ?? prev)
      setChangelog(data.changelog ?? [])
      setDecisionEntries(data.decisions ?? [])
      setSessionLogs(data.sessions ?? [])
      setDashboardError(null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      setDashboardError(message)
      console.error(error)
    }
  }, [])

  useEffect(() => {
    let alive = true
    // setState 는 타이머·프라미스 콜백 안에서만 일어나게 한다. effect 본문에서 동기로
    // 부르면 cascading render 로 잡힌다(react-hooks/set-state-in-effect) — VectorPanel 과 같은 패턴.
    const t = setTimeout(() => {
      void loadDashboard(true).finally(() => {
        if (alive) setLoading(false)
      })
    }, 0)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [loadDashboard])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const graphActive = activeView === "docs" && docsMode === "graph"

  useEffect(() => {
    if (!graphActive || constellationData) return
    let alive = true
    fetch(`/api/constellation?fresh=1&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: ConstellationData) => {
        if (!alive) return
        setConstellationData(data)
        if (data.timeRange?.dateMin && data.timeRange?.dateMax) {
          setConstellationAsOfYmd((prev) => prev ?? data.timeRange.dateMax!)
        }
      })
      .catch(console.error)
    return () => {
      alive = false
    }
  }, [graphActive, constellationData])

  const deferredConstellationAsOf = useDeferredValue(constellationAsOfYmd)

  const constellationViewData = useMemo(() => {
    if (!constellationData || !deferredConstellationAsOf) return constellationData
    const { dateMin, dateMax } = constellationData.timeRange
    if (!dateMin || !dateMax) return constellationData
    return filterConstellationAtDate(constellationData, deferredConstellationAsOf)
  }, [constellationData, deferredConstellationAsOf])

  /** 사이드바 단일 축 — 전체 · 성격(작성/수집) · 개별 분류를 한 map 으로 */
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: docs.length, managed: 0, collected: 0 }
    for (const d of docs) {
      map[d.category] = (map[d.category] ?? 0) + 1
      map[docScope(d.category)] += 1
    }
    return map
  }, [docs])

  const filtered = useMemo(() => docs.filter((d) => matchesFilter(d, activeCategory)), [docs, activeCategory])

  /** status 미기입 — 헤더에서 바로 보이게 */
  const scopeCounts = useMemo(() => countByScope(docs), [docs])

  /**
   * 유효한 선택 문서 — **파생 상태라 렌더 중에 계산한다.**
   * 이전에는 effect 두 개가 선택이 목록에서 빠질 때마다 setSelectedDoc(null) 을 불렀는데,
   * 그건 effect 로 파생값을 흉내 낸 것이라 렌더가 한 번 더 돌고 깜빡임이 생긴다
   * (react-hooks/set-state-in-effect 가 잡는 패턴). 계산으로 바꾸면 그 왕복이 사라진다.
   */
  const visibleDoc = useMemo(() => {
    if (!selectedDoc) return null
    if (graphActive) {
      return constellationViewData?.nodes.some((n) => n.relPath === selectedDoc) ? selectedDoc : null
    }
    return filtered.some((d) => d.relPath === selectedDoc) ? selectedDoc : null
  }, [selectedDoc, filtered, graphActive, constellationViewData])

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
          ? `완료: ${action}\n${(data.stdout ?? "").slice(0, 200)}`
          // 사람 게이트(403)는 실패가 아니라 정책이라 문구를 구분한다.
          : data.humanGate
            ? `사람 게이트: ${action}\n${data.error ?? ""}`
            : `실패: ${action}\n${data.error ?? ""}\n${(data.stderr ?? "").slice(0, 200)}`,
      })
    } catch {
      setActionResult({ action, ok: false, message: `네트워크 오류: ${action}` })
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

  const openDoc = useCallback((relPath: string) => {
    setActiveCategory("all")
    setSelectedDoc(relPath)
    setActiveView("docs")
    setDocsMode((m) => (m === "graph" ? m : "card"))
    setMobileNavOpen(false)
  }, [])

  const navigateFromHome = useCallback((tab: ViewTab, category?: DocFilter) => {
    if (category) {
      setActiveCategory(category)
      setDocsMode("card")
    }
    setActiveView(tab)
    setMobileNavOpen(false)
  }, [])

  const openMissionFromHome = useCallback((missionId: string) => {
    setProjectMission(missionId)
    setActiveView("projects")
    setMobileNavOpen(false)
  }, [])

  const openInboxFromHome = useCallback(() => {
    setActiveCategory("all")
    setDocsMode("card")
    setInboxOpen(true)
    setActiveView("docs")
    setMobileNavOpen(false)
  }, [])

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

  const sidebarHidden = activeView !== "docs"

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        onOpenSearch={() => setCmdOpen(true)}
        onOpenMobileNav={() => setMobileNavOpen(true)}
        stats={stats}
        gaps={scopeCounts.gaps}
      />
      <ViewTabs active={activeView} onChange={setActiveView} />

      <div className="relative flex flex-1 overflow-hidden">
        {/* 사이드바 = 문서 카테고리축. 다른 탭과 교집합이 없어 288px 를 상시 점유할 이유가 없다.
            언마운트 대신 hidden — Sidebar 내부 접힘 상태를 탭 전환 사이에 보존한다. */}
        <button
          type="button"
          aria-label="메뉴 닫기"
          className={cn(
            "fixed left-0 right-0 top-12 bottom-0 z-[35] bg-black/40 transition-opacity md:hidden",
            mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            sidebarHidden && "hidden"
          )}
          onClick={() => setMobileNavOpen(false)}
        />
        <div
          className={cn(
            "z-[40] flex h-full shrink-0 transition-transform duration-200 ease-out max-md:shadow-2xl",
            "fixed left-0 top-12 bottom-0 md:relative md:top-auto md:bottom-auto md:shadow-none md:transition-none",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            sidebarHidden && "hidden"
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
          {/* ── 홈 ── 한 화면 관제. 상세 기능은 기존 4개 원장으로 흡수한다. */}
          {activeView === "home" && (
            <ScrollArea className="flex-1 min-h-0">
              <HomeView
                stats={stats}
                docCounts={counts}
                gaps={scopeCounts.gaps}
                dashboardError={dashboardError}
                onNavigate={navigateFromHome}
                onOpenMission={openMissionFromHome}
                onOpenInbox={openInboxFromHome}
                onOpenDoc={openDoc}
              />
            </ScrollArea>
          )}

          {/* ── 프로젝트 ── 미션→레포→Task 3단 읽기 전용 드릴다운 */}
          {activeView === "projects" && (
            <ScrollArea className="flex-1 min-h-0">
              <ProjectView initialMissionId={projectMission} />
            </ScrollArea>
          )}

          {/* ── 문서 ── 카드/표/관계 3모드 + 인박스 */}
          {activeView === "docs" && (
            <>
              <div className="shrink-0 flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
                <div className="flex rounded-md border border-border p-0.5">
                  {DOCS_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setDocsMode(m.id)}
                      aria-pressed={docsMode === m.id}
                      className={cn(
                        "rounded px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        docsMode === m.id ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {CAT_LABEL[activeCategory] ?? activeCategory} · {filtered.length}건
                </span>
                <button
                  type="button"
                  onClick={() => setInboxOpen((v) => !v)}
                  aria-pressed={inboxOpen}
                  className={cn(
                    "ml-auto rounded-md border border-border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    inboxOpen ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  인박스
                </button>
              </div>

              {inboxOpen && (
                <div className="shrink-0 border-b border-border/60 px-3 py-3">
                  <div className="mx-auto max-w-5xl">
                    <YohanInboxPanel onSaved={() => void loadDashboard(true)} />
                  </div>
                </div>
              )}

              {docsMode === "graph" ? (
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
                            ? "노드 드래그 · 휠 줌 · 더블클릭 화면 맞춤 · 클릭 → 미리보기"
                            : "사이드바 카테고리로 필터 · 드래그 회전 · 휠 줌 · 별 클릭 → 미리보기"}
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
                            aria-label="관계 뷰 시점(as-of 날짜)"
                            className="h-1.5 min-w-[120px] flex-1 cursor-pointer accent-foreground"
                            min={ymdToDayKey(constellationData.timeRange.dateMin) ?? 0}
                            max={ymdToDayKey(constellationData.timeRange.dateMax) ?? 0}
                            value={ymdToDayKey(constellationAsOfYmd) ?? 0}
                            onChange={(e) => setConstellationAsOfYmd(dayKeyToYmd(Number(e.target.value)))}
                          />
                          <span className="text-[11px] tabular-nums text-foreground">{constellationAsOfYmd}</span>
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
                            filterCategory={activeCategory === "managed" || activeCategory === "collected" ? "all" : activeCategory}
                            selectedRelPath={visibleDoc}
                            onSelectDoc={(p) => { setSelectedDoc(p); setMobileNavOpen(false) }}
                            className="h-full min-h-[320px] w-full"
                          />
                        ) : (
                          <ConstellationCanvas
                            data={constellationViewData}
                            filterCategory={activeCategory === "managed" || activeCategory === "collected" ? "all" : activeCategory}
                            selectedRelPath={visibleDoc}
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
                  <DocPreview relPath={visibleDoc} onClose={() => setSelectedDoc(null)} fullscreenMobile />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                  <ScrollArea
                    className={cn(
                      "h-full min-h-0 w-full shrink-0 border-border md:border-r",
                      // 표는 열이 많아 항상 넓게. 카드는 **문서를 고른 뒤에만** 좁은 마스터 컬럼으로
                      // 접는다 — 고르기 전까지 320px 만 쓰면 넓은 화면에서 나머지가 빈 채로 남는다.
                      docsMode === "table" || !visibleDoc ? "md:flex-1" : "md:w-80"
                    )}
                  >
                    {docsMode === "table" ? (
                      <div className="p-4 pb-16">
                        <TableView docs={filtered} onSelectDoc={(p) => { setSelectedDoc(p); setMobileNavOpen(false) }} />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "p-3 pb-16",
                          visibleDoc
                            ? "space-y-2"
                            : "grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                        )}
                      >
                        {filtered.length === 0 ? (
                          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">문서가 없습니다</p>
                        ) : (
                          filtered.map((d) => (
                            <DocCard
                              key={d.relPath}
                              doc={d}
                              isActive={visibleDoc === d.relPath}
                              onClick={() => { setSelectedDoc(d.relPath); setMobileNavOpen(false) }}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </ScrollArea>
                  <DocPreview relPath={visibleDoc} onClose={() => setSelectedDoc(null)} fullscreenMobile />
                </div>
              )}
            </>
          )}

          {/* ── 기록 ── 타임라인 + 상태 카드 + 통계. 구 '통계'·'작업실' 탭을 흡수했다 */}
          {activeView === "records" && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="mx-auto max-w-5xl space-y-4 p-4 pb-16">
                <div className="rounded-xl border border-border overflow-hidden [&>div:last-child]:border-b-0">
                  <OvernightStatusCard />
                  <PublishStatusCard />
                </div>
                <TimelineView
                  changelog={changelog}
                  decisions={decisionEntries}
                  sessions={sessionLogs}
                  onSelectDoc={openDoc}
                />
                <FullCharts data={charts} />
              </div>
            </ScrollArea>
          )}

          {/* ── 벡터 ── 노션 → Qdrant 인제스트·검색. /vector 주소와 같은 컴포넌트 */}
          {activeView === "vector" && (
            <ScrollArea className="flex-1 min-h-0">
              <VectorPanel />
            </ScrollArea>
          )}
        </div>
      </div>

      {/* key = 닫힐 때마다 리마운트 → 검색어·AI 결과가 초기화된다. 팔레트 안에서
          effect 로 리셋하면 cascading render 가 되므로 리마운트로 처리한다. */}
      <CommandPalette
        key={cmdOpen ? "cmd-open" : "cmd-closed"}
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        docs={docs}
        onSelectDoc={openDoc}
        onQuickAction={handleQuickAction}
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
