import type { DocCategory, DocMeta } from "./types"

export const CONSTELLATION_CAT_ORDER: DocCategory[] = [
  "insights",
  "rss",
  "url",
  "wiki",
  "curriculum",
  "projects",
  "decisions",
  "rules",
  "templates",
]

/** 차트·별 노드·성운 색 정합 */
export const CATEGORY_GLOW_COLORS: Record<DocCategory, string> = {
  insights: "#818cf8",
  rss: "#a78bfa",
  url: "#34d399",
  wiki: "#22d3ee",
  curriculum: "#86efac",
  projects: "#fb923c",
  decisions: "#fbbf24",
  rules: "#f472b6",
  templates: "#38bdf8",
}

export const CATEGORY_LABELS: Record<DocCategory, string> = {
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

function hashStable(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function relPathForRelated(needle: string, docs: DocMeta[]): string | null {
  const n = needle.trim()
  if (!n) return null
  for (const d of docs) {
    if (d.id === n) return d.relPath
  }
  const norm = n.replace(/\\/g, "/")
  for (const d of docs) {
    const rp = d.relPath.replace(/\\/g, "/")
    if (rp === norm) return d.relPath
    const base = rp.split("/").pop()?.replace(/\.md$/, "") ?? ""
    const nn = norm.replace(/\.md$/, "").split("/").pop() ?? norm
    if (base === nn) return d.relPath
  }
  return null
}

export interface ConstellationNodePayload {
  relPath: string
  id: string
  title: string
  category: DocCategory
  /** YYYY-MM-DD or null (날짜 없음 → 시간 필터에서 항상 표시) */
  date: string | null
  color: string
  x: number
  y: number
  z: number
  degree: number
}

export interface ConstellationEdgePayload {
  from: string
  to: string
}

export interface GalaxySummary {
  category: DocCategory
  label: string
  count: number
  x: number
  y: number
  z: number
}

export interface ConstellationTimeRange {
  dateMin: string | null
  dateMax: string | null
}

export interface ConstellationData {
  nodes: ConstellationNodePayload[]
  edges: ConstellationEdgePayload[]
  galaxies: GalaxySummary[]
  timeRange: ConstellationTimeRange
}

/** UTC 자정 기준 일수 (슬라이더용) */
export function ymdToDayKey(ymd: string | null): number | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return null
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

export function dayKeyToYmd(day: number): string {
  const x = new Date(day * 86400000)
  const y = x.getUTCFullYear()
  const mo = String(x.getUTCMonth() + 1).padStart(2, "0")
  const da = String(x.getUTCDate()).padStart(2, "0")
  return `${y}-${mo}-${da}`
}

/**
 * D-2 시점 필터 규칙 (§10.1):
 * - `asOfYmd`: 해당 날짜 **포함**까지 보이는 스냅샷(종료일 닫힌 구간).
 * - 노드 `date === null` · 파싱 불가: 날짜 미상 → **항상 표시**(과거 인제스트 등).
 * - 노드에 유효한 YYYY-MM-DD가 있으면: `dayKey(date) <= dayKey(asOfYmd)` 일 때만 표시.
 * - 엣지: 양 끝 노드가 모두 보일 때만 유지.
 * - `degree`: 보이는 부분 그래프에서 연결 수로 재계산.
 * - `galaxies[].count`: 필터 후 해당 카테고리 노드 수로 갱신.
 * - `timeRange`: 원본 스펙트럼 유지(슬라이더 바운드용); 필터링하지 않음.
 */
export function filterConstellationAtDate(data: ConstellationData, asOfYmd: string): ConstellationData {
  const cutoff = ymdToDayKey(asOfYmd)
  if (cutoff === null) return data

  const visibleNodes = data.nodes.filter((n) => {
    const dk = ymdToDayKey(n.date)
    return dk === null || dk <= cutoff
  })
  const visible = new Set(visibleNodes.map((n) => n.relPath))

  const edges = data.edges.filter((e) => visible.has(e.from) && visible.has(e.to))

  const deg = new Map<string, number>()
  for (const n of visibleNodes) deg.set(n.relPath, 0)
  for (const e of edges) {
    deg.set(e.from, (deg.get(e.from) ?? 0) + 1)
    deg.set(e.to, (deg.get(e.to) ?? 0) + 1)
  }

  const nodes = visibleNodes.map((n) => ({
    ...n,
    degree: deg.get(n.relPath) ?? 0,
  }))

  const galaxies = data.galaxies.map((g) => ({
    ...g,
    count: nodes.filter((n) => n.category === g.category).length,
  }))

  return {
    nodes,
    edges,
    galaxies,
    timeRange: data.timeRange,
  }
}

const GALAXY_R = 14
const CLUSTER_R = 5.2

export function buildConstellation(docs: DocMeta[]): ConstellationData {
  const edgesRaw: { from: string; to: string }[] = []
  for (const d of docs) {
    for (const r of d.related ?? []) {
      const to = relPathForRelated(r, docs)
      if (!to || to === d.relPath) continue
      const a = d.relPath < to ? d.relPath : to
      const b = d.relPath < to ? to : d.relPath
      edgesRaw.push({ from: a, to: b })
    }
  }
  const edgeKey = new Set<string>()
  const edges: ConstellationEdgePayload[] = []
  for (const e of edgesRaw) {
    const k = `${e.from}|${e.to}`
    if (edgeKey.has(k)) continue
    edgeKey.add(k)
    edges.push({ from: e.from, to: e.to })
  }

  const degreeMap = new Map<string, number>()
  for (const d of docs) degreeMap.set(d.relPath, 0)
  for (const e of edges) {
    degreeMap.set(e.from, (degreeMap.get(e.from) ?? 0) + 1)
    degreeMap.set(e.to, (degreeMap.get(e.to) ?? 0) + 1)
  }

  const galaxies: GalaxySummary[] = CONSTELLATION_CAT_ORDER.map((cat, i) => {
    const angle = (i / CONSTELLATION_CAT_ORDER.length) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(angle) * GALAXY_R
    const z = Math.sin(angle) * GALAXY_R
    const count = docs.filter((d) => d.category === cat).length
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      count,
      x,
      y: 0,
      z,
    }
  })

  const nodes: ConstellationNodePayload[] = []
  for (const cat of CONSTELLATION_CAT_ORDER) {
    const center = galaxies.find((g) => g.category === cat)!
    const inCat = docs.filter((d) => d.category === cat)
    const n = inCat.length
    inCat.forEach((d, i) => {
      const h = hashStable(d.relPath)
      const golden = Math.PI * (3 - Math.sqrt(5))
      const yi = n > 1 ? (i / (n - 1)) * 2 - 1 : 0
      const rr = Math.sqrt(Math.max(0, 1 - yi * yi))
      const theta = golden * i
      const ox = Math.cos(theta) * rr * CLUSTER_R * 0.85
      const oy = yi * CLUSTER_R * 0.55 + ((h % 100) / 100 - 0.5) * 0.9
      const oz = Math.sin(theta) * rr * CLUSTER_R * 0.85
      const jx = (((h >> 8) % 1000) / 1000 - 0.5) * 0.45
      const jz = (((h >> 16) % 1000) / 1000 - 0.5) * 0.45
      nodes.push({
        relPath: d.relPath,
        id: d.id,
        title: d.title,
        category: cat,
        date: d.date,
        color: CATEGORY_GLOW_COLORS[cat],
        x: center.x + ox + jx,
        y: center.y + oy,
        z: center.z + oz + jz,
        degree: degreeMap.get(d.relPath) ?? 0,
      })
    })
  }

  const dated = nodes.map((n) => n.date).filter((x): x is string => typeof x === "string" && x.length >= 10)
  let dateMin: string | null = null
  let dateMax: string | null = null
  if (dated.length > 0) {
    const sorted = [...dated].sort()
    dateMin = sorted[0]!.slice(0, 10)
    dateMax = sorted[sorted.length - 1]!.slice(0, 10)
  }

  return {
    nodes,
    edges,
    galaxies,
    timeRange: { dateMin, dateMax },
  }
}
