"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Maximize, RotateCcw, Search, Settings, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CATEGORY_GLOW_COLORS,
  CATEGORY_LABELS,
  CONSTELLATION_CAT_ORDER,
  type ConstellationData,
} from "@/lib/constellation"
import type { DocCategory } from "@/lib/types"
import {
  DEFAULT_FORCE_PARAMS,
  ForceSim2D,
  type ForceParams,
  type SimLink,
  type SimNode,
} from "@/lib/force-sim-2d"

/* ──────────────────────────── 타입 ──────────────────────────── */

interface GraphNode extends SimNode {
  title: string
  category: DocCategory
  color: string
}

type GraphLink = SimLink<GraphNode>

interface DisplaySettings {
  arrows: boolean
  /** -3~3 · 클수록 라벨이 일찍(줌아웃 상태에서도) 나타남 */
  textFade: number
  nodeSize: number
  lineThickness: number
}

const DEFAULT_DISPLAY: DisplaySettings = {
  arrows: false,
  textFade: 0,
  nodeSize: 1,
  lineThickness: 1,
}

interface Camera {
  x: number
  y: number
  k: number
}

type DragState =
  | { type: "node"; node: GraphNode; startX: number; startY: number; moved: boolean }
  | { type: "pan"; startX: number; startY: number; camX: number; camY: number }

/* ──────────────────────────── 렌더 헬퍼 ──────────────────────────── */

const BG_COLOR = "#0a0d12"
const LINK_COLOR = "#64748b"
const LINK_FOCUS_COLOR = "#a5b4fc"
const LABEL_COLOR = "#9aa4b2"
const SELECT_RING_COLOR = "#e2e8f0"

function nodeRadius(n: GraphNode, nodeSize: number): number {
  return (4.5 + Math.sqrt(n.degree + 1) * 3) * nodeSize
}

function labelAlpha(k: number, textFade: number): number {
  const a = (Math.log2(k) + 1.2 + textFade * 0.8) * 1.7
  return Math.max(0, Math.min(1, a))
}

function truncate(s: string, max = 26): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

interface DrawArgs {
  nodes: GraphNode[]
  links: GraphLink[]
  adjacency: Map<string, Set<string>>
  cam: Camera
  w: number
  h: number
  dpr: number
  hover: GraphNode | null
  selected: string | null
  filterCategory: DocCategory | "all"
  display: DisplaySettings
}

function drawGraph(ctx: CanvasRenderingContext2D, args: DrawArgs) {
  const { nodes, links, adjacency, cam, w, h, dpr, hover, selected, filterCategory, display } = args

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, w, h)
  ctx.setTransform(dpr * cam.k, 0, 0, dpr * cam.k, dpr * cam.x, dpr * cam.y)

  const hoverMode = hover != null
  const neighbors = hover ? adjacency.get(hover.id) : undefined
  const catDim = (n: GraphNode) => filterCategory !== "all" && n.category !== filterCategory
  const nodeAlpha = (n: GraphNode): number => {
    if (hoverMode) return n === hover || neighbors?.has(n.id) ? 1 : 0.12
    return catDim(n) ? 0.18 : 1
  }

  const lineW = 1.1 * display.lineThickness
  for (const l of links) {
    let alpha = 0.25
    let color = LINK_COLOR
    if (hoverMode) {
      const touches = l.source === hover || l.target === hover
      alpha = touches ? 0.85 : 0.03
      if (touches) color = LINK_FOCUS_COLOR
    } else if (catDim(l.source) || catDim(l.target)) {
      alpha = 0.06
    }
    if (alpha <= 0.01) continue
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = lineW
    ctx.beginPath()
    ctx.moveTo(l.source.x, l.source.y)
    ctx.lineTo(l.target.x, l.target.y)
    ctx.stroke()

    if (display.arrows && alpha > 0.05) {
      const dx = l.target.x - l.source.x
      const dy = l.target.y - l.source.y
      const dist = Math.hypot(dx, dy)
      if (dist > 1) {
        const angle = Math.atan2(dy, dx)
        const tipDist = nodeRadius(l.target, display.nodeSize) + 3
        const ax = l.target.x - Math.cos(angle) * tipDist
        const ay = l.target.y - Math.sin(angle) * tipDist
        const size = 4 + 2.5 * display.lineThickness
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax - Math.cos(angle - 0.45) * size, ay - Math.sin(angle - 0.45) * size)
        ctx.lineTo(ax - Math.cos(angle + 0.45) * size, ay - Math.sin(angle + 0.45) * size)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  for (const n of nodes) {
    const alpha = nodeAlpha(n)
    const r = nodeRadius(n, display.nodeSize) * (n === hover ? 1.15 : 1)
    ctx.globalAlpha = alpha
    ctx.fillStyle = n.color
    ctx.beginPath()
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
    ctx.fill()

    if (selected === n.id) {
      ctx.globalAlpha = Math.max(alpha, 0.9)
      ctx.strokeStyle = SELECT_RING_COLOR
      ctx.lineWidth = Math.max(1.6 / cam.k, 0.8)
      ctx.beginPath()
      ctx.arc(n.x, n.y, r + Math.max(2.5 / cam.k, 2), 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  const baseLabel = labelAlpha(cam.k, display.textFade)
  ctx.font = "11px ui-sans-serif, system-ui, -apple-system, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  for (const n of nodes) {
    let alpha = baseLabel * nodeAlpha(n)
    if (n === hover) alpha = Math.max(alpha, 0.95)
    if (alpha <= 0.02) continue
    const r = nodeRadius(n, display.nodeSize)
    ctx.globalAlpha = alpha
    ctx.fillStyle = LABEL_COLOR
    ctx.fillText(truncate(n.title), n.x, n.y + r + 4)
  }

  ctx.globalAlpha = 1
}

/* ──────────────────────────── 설정 패널 UI ──────────────────────────── */

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-accent/50"
      >
        {title}
        <ChevronDown size={12} className={cn("transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block px-3 py-1">
      <span className="flex items-center justify-between text-[10px] text-muted-foreground">
        {label}
        <span className="tabular-nums text-foreground">{value}</span>
      </span>
      <input
        type="range"
        className="mt-1 h-1 w-full cursor-pointer accent-foreground"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
  swatch,
  suffix,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  swatch?: string
  suffix?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground">
      <input
        type="checkbox"
        className="size-3.5 rounded border-border accent-foreground"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {swatch && <span className="size-2.5 rounded-full" style={{ backgroundColor: swatch }} />}
      <span className="flex-1">{label}</span>
      {suffix && <span className="tabular-nums text-[10px]">{suffix}</span>}
    </label>
  )
}

/* ──────────────────────────── 메인 컴포넌트 ──────────────────────────── */

export interface GraphView2DProps {
  data: ConstellationData
  filterCategory: DocCategory | "all"
  selectedRelPath: string | null
  onSelectDoc: (relPath: string) => void
  className?: string
}

export function GraphView2D({
  data,
  filterCategory,
  selectedRelPath,
  onSelectDoc,
  className,
}: GraphView2DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const simRef = useRef<ForceSim2D<GraphNode> | null>(null)
  if (simRef.current == null) {
    simRef.current = new ForceSim2D<GraphNode>()
  }
  const nodesRef = useRef<GraphNode[]>([])
  const linksRef = useRef<GraphLink[]>([])
  const adjRef = useRef<Map<string, Set<string>>>(new Map())
  const camRef = useRef<Camera>({ x: 0, y: 0, k: 0.3 })
  const camInitRef = useRef(false)
  const autoFitRef = useRef(true)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const hoverRef = useRef<GraphNode | null>(null)
  const dragRef = useRef<DragState | null>(null)

  // 옵시디언 설정 패널 상태: 필터 / 그룹 / 표시 / 힘
  const [panelOpen, setPanelOpen] = useState(false)
  const [sections, setSections] = useState({ filters: true, groups: false, display: true, forces: false })
  const [query, setQuery] = useState("")
  const [showOrphans, setShowOrphans] = useState(true)
  const [hiddenCats, setHiddenCats] = useState<Set<DocCategory>>(new Set())
  const [display, setDisplay] = useState<DisplaySettings>(DEFAULT_DISPLAY)
  const [forces, setForces] = useState<ForceParams>(DEFAULT_FORCE_PARAMS)

  // RAF 루프·이벤트 핸들러가 항상 최신 값을 읽도록 ref 미러 (커밋 후 동기화)
  const stateRef = useRef({ filterCategory, selectedRelPath, display, forces, onSelectDoc })
  useEffect(() => {
    stateRef.current = { filterCategory, selectedRelPath, display, forces, onSelectDoc }
  })

  /* 필터 적용 후 보이는 그래프 (옵시디언: 검색·고아·그룹 토글은 노드를 제거) */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const nodes = data.nodes.filter((n) => {
      if (hiddenCats.has(n.category)) return false
      if (!showOrphans && n.degree === 0) return false
      if (q && !n.title.toLowerCase().includes(q) && !n.relPath.toLowerCase().includes(q)) return false
      return true
    })
    const vis = new Set(nodes.map((n) => n.relPath))
    const edges = data.edges.filter((e) => vis.has(e.from) && vis.has(e.to))
    return { nodes, edges }
  }, [data, query, showOrphans, hiddenCats])

  const catCounts = useMemo(() => {
    const m = new Map<DocCategory, number>()
    for (const n of data.nodes) m.set(n.category, (m.get(n.category) ?? 0) + 1)
    return m
  }, [data])

  /* 보이는 그래프 → 시뮬레이션 동기화 (기존 노드 좌표·속도 보존) */
  useEffect(() => {
    const sim = simRef.current!
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]))
    let changed = visible.nodes.length !== nodesRef.current.length
    const nodes: GraphNode[] = visible.nodes.map((d) => {
      const old = prev.get(d.relPath)
      if (old) {
        old.title = d.title
        old.category = d.category
        old.color = d.color
        old.degree = d.degree
        return old
      }
      changed = true
      // 신규 노드는 3D 클러스터 좌표(x,z)를 시드로 사용 → 카테고리 군집 근처에서 출발
      return {
        id: d.relPath,
        title: d.title,
        category: d.category,
        color: d.color,
        degree: d.degree,
        x: d.x * 16 + (Math.random() - 0.5) * 40,
        y: d.z * 16 + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      }
    })
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const links: GraphLink[] = []
    const adj = new Map<string, Set<string>>()
    for (const e of visible.edges) {
      const s = byId.get(e.from)
      const t = byId.get(e.to)
      if (!s || !t) continue
      const denom = s.degree + t.degree
      links.push({ source: s, target: t, bias: denom > 0 ? s.degree / denom : 0.5 })
      if (!adj.has(s.id)) adj.set(s.id, new Set())
      if (!adj.has(t.id)) adj.set(t.id, new Set())
      adj.get(s.id)!.add(t.id)
      adj.get(t.id)!.add(s.id)
    }
    if (links.length !== linksRef.current.length) changed = true
    nodesRef.current = nodes
    linksRef.current = links
    adjRef.current = adj
    sim.nodes = nodes
    sim.links = links
    if (changed) sim.poke(prev.size === 0 ? 1 : 0.45)
    if (hoverRef.current && !byId.has(hoverRef.current.id)) hoverRef.current = null
  }, [visible])

  /* 힘 파라미터 변경 → 재가열 */
  useEffect(() => {
    const sim = simRef.current!
    sim.params = forces
    sim.poke(0.35)
  }, [forces])

  /* 캔버스 리사이즈 */
  useEffect(() => {
    const el = containerRef.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = el.clientWidth
      const h = el.clientHeight
      sizeRef.current = { w, h, dpr }
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* 포인터 인터랙션: 노드 드래그 · 배경 팬 · 휠 줌 · 호버 · 클릭 */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (e: PointerEvent | WheelEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const toWorld = (p: { x: number; y: number }) => {
      const cam = camRef.current
      return { x: (p.x - cam.x) / cam.k, y: (p.y - cam.y) / cam.k }
    }
    const hit = (p: { x: number; y: number }): GraphNode | null => {
      const w = toWorld(p)
      const { nodeSize } = stateRef.current.display
      const pad = 4 / camRef.current.k
      let best: GraphNode | null = null
      let bestD = Infinity
      for (const n of nodesRef.current) {
        const r = nodeRadius(n, nodeSize) + pad
        const dx = n.x - w.x
        const dy = n.y - w.y
        const d2 = dx * dx + dy * dy
        if (d2 < r * r && d2 < bestD) {
          best = n
          bestD = d2
        }
      }
      return best
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const p = getPos(e)
      const n = hit(p)
      canvas.setPointerCapture(e.pointerId)
      if (n) {
        dragRef.current = { type: "node", node: n, startX: p.x, startY: p.y, moved: false }
        n.fx = n.x
        n.fy = n.y
        simRef.current!.setAlphaTarget(0.3)
        simRef.current!.poke(0.3)
      } else {
        const cam = camRef.current
        dragRef.current = { type: "pan", startX: p.x, startY: p.y, camX: cam.x, camY: cam.y }
      }
    }
    const onPointerMove = (e: PointerEvent) => {
      const p = getPos(e)
      const drag = dragRef.current
      if (drag?.type === "node") {
        const w = toWorld(p)
        drag.node.fx = w.x
        drag.node.fy = w.y
        if (Math.hypot(p.x - drag.startX, p.y - drag.startY) > 4) drag.moved = true
      } else if (drag?.type === "pan") {
        autoFitRef.current = false
        const cam = camRef.current
        cam.x = drag.camX + (p.x - drag.startX)
        cam.y = drag.camY + (p.y - drag.startY)
        hoverRef.current = null
        canvas.style.cursor = "grabbing"
      } else {
        const n = hit(p)
        hoverRef.current = n
        canvas.style.cursor = n ? "pointer" : "grab"
      }
    }
    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current
      dragRef.current = null
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* capture 미보유 시 무시 */
      }
      canvas.style.cursor = "grab"
      if (!drag) return
      if (drag.type === "node") {
        simRef.current!.setAlphaTarget(0)
        drag.node.fx = null
        drag.node.fy = null
        if (!drag.moved) stateRef.current.onSelectDoc(drag.node.id)
      }
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      autoFitRef.current = false
      const p = getPos(e)
      const cam = camRef.current
      const k2 = Math.min(8, Math.max(0.02, cam.k * Math.exp(-e.deltaY * 0.00125)))
      cam.x = p.x - ((p.x - cam.x) / cam.k) * k2
      cam.y = p.y - ((p.y - cam.y) / cam.k) * k2
      cam.k = k2
    }
    const onDblClick = () => {
      autoFitRef.current = true
    }
    const onLeave = () => {
      if (!dragRef.current) hoverRef.current = null
    }

    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("pointermove", onPointerMove)
    canvas.addEventListener("pointerup", onPointerUp)
    canvas.addEventListener("pointercancel", onPointerUp)
    canvas.addEventListener("pointerleave", onLeave)
    canvas.addEventListener("wheel", onWheel, { passive: false })
    canvas.addEventListener("dblclick", onDblClick)
    canvas.style.cursor = "grab"
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("pointercancel", onPointerUp)
      canvas.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("wheel", onWheel)
      canvas.removeEventListener("dblclick", onDblClick)
    }
  }, [])

  /* 메인 루프: 시뮬레이션 틱 → 자동 맞춤 → 드로우 */
  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return
      const { w, h, dpr } = sizeRef.current
      if (w === 0 || h === 0) return

      const sim = simRef.current!
      sim.tick()

      const nodes = nodesRef.current
      const cam = camRef.current
      if (autoFitRef.current && nodes.length > 0) {
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const n of nodes) {
          if (n.x < minX) minX = n.x
          if (n.x > maxX) maxX = n.x
          if (n.y < minY) minY = n.y
          if (n.y > maxY) maxY = n.y
        }
        const pad = 80
        const bw = maxX - minX + pad * 2
        const bh = maxY - minY + pad * 2
        const kFit = Math.min(1.6, Math.max(0.02, Math.min(w / bw, h / bh)))
        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2
        const tx = w / 2 - cx * kFit
        const ty = h / 2 - cy * kFit
        if (!camInitRef.current) {
          cam.k = kFit
          cam.x = tx
          cam.y = ty
          camInitRef.current = true
        } else {
          cam.k += (kFit - cam.k) * 0.08
          cam.x += (tx - cam.x) * 0.08
          cam.y += (ty - cam.y) * 0.08
        }
      }

      const st = stateRef.current
      drawGraph(ctx, {
        nodes,
        links: linksRef.current,
        adjacency: adjRef.current,
        cam,
        w,
        h,
        dpr,
        hover: hoverRef.current,
        selected: st.selectedRelPath,
        filterCategory: st.filterCategory,
        display: st.display,
      })
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const resetSettings = () => {
    setDisplay(DEFAULT_DISPLAY)
    setForces(DEFAULT_FORCE_PARAMS)
    setQuery("")
    setShowOrphans(true)
    setHiddenCats(new Set())
  }

  const toggleCat = (cat: DocCategory, visibleCat: boolean) => {
    setHiddenCats((prev) => {
      const next = new Set(prev)
      if (visibleCat) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)} style={{ minHeight: 320 }}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* 우상단 컨트롤: 화면 맞춤 · 설정 (옵시디언 그래프뷰 코너 버튼) */}
      <div className="absolute right-2 top-2 flex items-start gap-1.5">
        <button
          type="button"
          title="화면 맞춤 (더블클릭과 동일)"
          onClick={() => {
            autoFitRef.current = true
          }}
          className="rounded-md border border-border bg-card/90 p-1.5 text-muted-foreground shadow-md backdrop-blur-sm hover:text-foreground"
        >
          <Maximize size={13} />
        </button>
        <button
          type="button"
          title="그래프 설정"
          onClick={() => setPanelOpen((v) => !v)}
          className={cn(
            "rounded-md border border-border bg-card/90 p-1.5 shadow-md backdrop-blur-sm hover:text-foreground",
            panelOpen ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Settings size={13} />
        </button>
      </div>

      {/* 옵시디언식 설정 패널: 필터 / 그룹 / 표시 / 힘 */}
      {panelOpen && (
        <div className="absolute right-2 top-11 z-10 max-h-[calc(100%-3.5rem)] w-60 overflow-y-auto rounded-lg border border-border bg-card/95 shadow-xl backdrop-blur-sm">
          <Section
            title="필터"
            open={sections.filters}
            onToggle={() => setSections((s) => ({ ...s, filters: !s.filters }))}
          >
            <div className="px-3 pb-1">
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1">
                <Search size={11} className="shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="노드 검색…"
                  className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
            <CheckRow label="고아 노드 표시" checked={showOrphans} onChange={setShowOrphans} />
          </Section>

          <Section
            title="그룹"
            open={sections.groups}
            onToggle={() => setSections((s) => ({ ...s, groups: !s.groups }))}
          >
            {CONSTELLATION_CAT_ORDER.map((cat) => (
              <CheckRow
                key={cat}
                label={CATEGORY_LABELS[cat]}
                checked={!hiddenCats.has(cat)}
                onChange={(v) => toggleCat(cat, v)}
                swatch={CATEGORY_GLOW_COLORS[cat]}
                suffix={String(catCounts.get(cat) ?? 0)}
              />
            ))}
          </Section>

          <Section
            title="표시"
            open={sections.display}
            onToggle={() => setSections((s) => ({ ...s, display: !s.display }))}
          >
            <CheckRow
              label="화살표"
              checked={display.arrows}
              onChange={(v) => setDisplay((d) => ({ ...d, arrows: v }))}
            />
            <SliderRow
              label="텍스트 흐림 임계값"
              value={display.textFade}
              min={-3}
              max={3}
              step={0.1}
              onChange={(v) => setDisplay((d) => ({ ...d, textFade: v }))}
            />
            <SliderRow
              label="노드 크기"
              value={display.nodeSize}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(v) => setDisplay((d) => ({ ...d, nodeSize: v }))}
            />
            <SliderRow
              label="선 굵기"
              value={display.lineThickness}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(v) => setDisplay((d) => ({ ...d, lineThickness: v }))}
            />
          </Section>

          <Section
            title="힘"
            open={sections.forces}
            onToggle={() => setSections((s) => ({ ...s, forces: !s.forces }))}
          >
            <SliderRow
              label="중심 힘"
              value={forces.center}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setForces((f) => ({ ...f, center: v }))}
            />
            <SliderRow
              label="반발 힘"
              value={forces.repel}
              min={0}
              max={20}
              step={0.1}
              onChange={(v) => setForces((f) => ({ ...f, repel: v }))}
            />
            <SliderRow
              label="링크 힘"
              value={forces.link}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setForces((f) => ({ ...f, link: v }))}
            />
            <SliderRow
              label="링크 거리"
              value={forces.linkDistance}
              min={30}
              max={500}
              step={1}
              onChange={(v) => setForces((f) => ({ ...f, linkDistance: v }))}
            />
          </Section>

          <div className="flex items-center justify-end px-3 py-2">
            <button
              type="button"
              onClick={resetSettings}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RotateCcw size={10} />
              설정 초기화
            </button>
          </div>
        </div>
      )}

      {/* 좌하단 통계 */}
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground backdrop-blur-sm">
        노드 {visible.nodes.length} · 링크 {visible.edges.length}
      </div>
    </div>
  )
}
