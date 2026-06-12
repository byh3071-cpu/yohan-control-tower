import { readdir, readFile, stat } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import { join, relative, resolve, sep } from "node:path"
import matter from "gray-matter"
import { buildDomainCounts, DOMAIN_COLORS, tagToDomain } from "./domains"
import { getMemoryDir } from "./paths"
import type {
  DocCategory,
  DocMeta,
  DocFull,
  ChartData,
  Stats,
  EvaluatorRollup,
  HeatmapDay,
  IngestTrend,
  DomainSlice,
  CategorySlice,
  SourceSlice,
  BatchDay,
  ActivityPoint,
  DecisionPoint,
  GitCommit,
  DecisionEntry,
  SessionLog,
} from "./types"

export type {
  DocCategory,
  DocMeta,
  DocFull,
  ChartData,
  Stats,
  HeatmapDay,
  EvaluatorRollup,
  GitCommit,
  DecisionEntry,
  SessionLog,
} from "./types"

/** `listDocs` / `getDoc` 허용 경로·카테고리 (memory/ 기준 상대, `.md`만) */
export const DOC_SOURCES = [
  { prefix: "ingest/insights", category: "insights" },
  { prefix: "ingest/rss", category: "rss" },
  { prefix: "ingest/url", category: "url" },
  { prefix: "wiki", category: "wiki" },
  { prefix: "inbox/archive/md_files", category: "curriculum" },
  { prefix: "inbox/md_files", category: "curriculum" },
  { prefix: "projects", category: "projects" },
  { prefix: "decisions", category: "decisions" },
  { prefix: "rules", category: "rules" },
  { prefix: "templates", category: "templates" },
] as const satisfies ReadonlyArray<{ prefix: string; category: DocCategory }>

export const DOC_SCAN_PREFIXES = DOC_SOURCES.map((s) => s.prefix)

export function isDocPathAllowed(relPath: string): boolean {
  if (!relPath || relPath.includes("\0")) return false
  const norm = relPath.replace(/\\/g, "/").replace(/^\/+/, "")
  if (norm.includes("..") || !norm.endsWith(".md")) return false
  return DOC_SCAN_PREFIXES.some((p) => norm === p || norm.startsWith(`${p}/`))
}

const MEMORY_ROOT = getMemoryDir()

function categorize(relPath: string): DocCategory {
  const norm = relPath.replace(/\\/g, "/")
  for (const { prefix, category } of DOC_SOURCES) {
    if (norm === prefix || norm.startsWith(`${prefix}/`)) return category
  }
  return "rules"
}

const CATEGORY_LABELS: Record<DocCategory, string> = {
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

export function getCategoryLabel(cat: DocCategory): string {
  return CATEGORY_LABELS[cat] ?? cat
}

async function collectMdFiles(dir: string, base: string): Promise<string[]> {
  const result: string[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        result.push(...(await collectMdFiles(full, base)))
      } else if (e.name.endsWith(".md") && !e.name.startsWith("README")) {
        result.push(full)
      }
    }
  } catch {
    /* skip unreadable dirs */
  }
  return result
}

function extractDate(data: Record<string, unknown>, fileName: string): string | null {
  for (const key of ["ingested_at", "date", "created", "published"]) {
    const v = data[key]
    if (!v) continue
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    if (typeof v === "string") {
      const m = v.match(/^\d{4}-\d{2}-\d{2}/)
      if (m) return m[0]
    }
  }
  const fm = fileName.match(/^(\d{4}-\d{2}-\d{2})/)
  if (fm) return fm[1]
  return null
}

function extractSourceName(data: Record<string, unknown>): string | null {
  if (typeof data.source_name === "string" && data.source_name) return data.source_name
  return null
}

function extractRelated(data: Record<string, unknown>): string[] {
  const r = data.related
  if (!Array.isArray(r)) return []
  return r.filter((x): x is string => typeof x === "string" && x.length > 0)
}

function extractTitle(data: Record<string, unknown>, content: string, fileName: string): string {
  if (typeof data.title === "string" && data.title) return data.title
  const h1 = content.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].trim()
  return fileName.replace(/\.md$/, "")
}

function extractExcerpt(content: string, max = 120): string {
  const cleaned = content
    .replace(/^---[\s\S]*?---/, "")
    .replace(/^#+\s+.+$/gm, "")
    .replace(/[*_`[\]]/g, "")
    .trim()
  const firstPara = cleaned.split("\n\n")[0] ?? ""
  const flat = firstPara.replace(/\n/g, " ").trim()
  return flat.length > max ? flat.slice(0, max) + "…" : flat
}

export async function listDocs(): Promise<DocMeta[]> {
  const allFiles: string[] = []
  for (const d of DOC_SCAN_PREFIXES) {
    allFiles.push(...(await collectMdFiles(join(MEMORY_ROOT, d), MEMORY_ROOT)))
  }

  const docs: DocMeta[] = []

  for (const filePath of allFiles) {
    try {
      const raw = await readFile(filePath, "utf8")
      const { data, content } = matter(raw)
      const relPath = relative(MEMORY_ROOT, filePath).replace(/\\/g, "/")
      const fileName = filePath.split(/[\\/]/).pop() ?? ""

      const cat = categorize(relPath)
      const title = extractTitle(data, content, fileName)
      const excerpt = extractExcerpt(content)

      docs.push({
        id: typeof data.id === "string" ? data.id : relPath,
        title,
        date: extractDate(data, fileName),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        related: extractRelated(data),
        category: cat,
        relPath,
        excerpt,
        sourceName: extractSourceName(data),
      })
    } catch {
      /* skip unparseable files */
    }
  }

  docs.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  return docs
}

export async function getDoc(relPath: string): Promise<DocFull | null> {
  const norm = relPath.replace(/\\/g, "/")
  if (!isDocPathAllowed(norm)) return null

  const absRoot = resolve(MEMORY_ROOT)
  const filePath = resolve(join(MEMORY_ROOT, norm))
  const relToRoot = relative(absRoot, filePath)
  if (relToRoot.startsWith("..") || relToRoot.includes(`..${sep}`)) return null

  try {
    const raw = await readFile(filePath, "utf8")
    const { data, content } = matter(raw)
    const fileName = filePath.split(/[\\/]/).pop() ?? ""

    return {
      id: typeof data.id === "string" ? data.id : norm,
      title: extractTitle(data, content, fileName),
      date: extractDate(data, fileName),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      related: extractRelated(data),
      category: categorize(norm),
      relPath: norm,
      excerpt: extractExcerpt(content),
      sourceName: extractSourceName(data),
      content,
      frontmatter: data,
    }
  } catch {
    return null
  }
}

  export async function parseBatchHistory(): Promise<BatchDay[]> {
  const days: Record<string, { ok: number; fail: number }> = {}
  try {
    const log = await readFile(join(MEMORY_ROOT, "logs", "automation-batch.log"), "utf8")
    let currentDate = ""
    for (const line of log.split("\n")) {
      const dm = line.match(/^\[(\d{4}-\d{2}-\d{2})/)
      if (dm) currentDate = dm[1]
      if (!currentDate) continue
      const sm = line.match(/실패=(\d+)/) ?? line.match(/fail=(\d+)/i)
      const done = line.includes("DONE")
      if (done) {
        if (!days[currentDate]) days[currentDate] = { ok: 0, fail: 0 }
        const failCount = sm ? parseInt(sm[1]) : 0
        if (failCount > 0) days[currentDate].fail++
        else days[currentDate].ok++
      }
    }
  } catch { /* no log */ }
  return Object.entries(days)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
}

export function buildChartData(docs: DocMeta[], batchHistory: BatchDay[]): ChartData {
  const dateCounts: Record<string, number> = {}
  for (const d of docs) {
    if (d.date && ["insights", "rss", "url"].includes(d.category)) {
      dateCounts[d.date] = (dateCounts[d.date] ?? 0) + 1
    }
  }
  const sortedDates = Object.keys(dateCounts).sort()
  const last30 = sortedDates.slice(-30)
  const ingestTrend: IngestTrend[] = last30.map((date) => ({ date, count: dateCounts[date] }))

  const allTags = docs.flatMap((d) => d.tags)
  const domainCounts = buildDomainCounts(allTags)
  const domainDist: DomainSlice[] = Object.entries(domainCounts)
    .filter(([, count]) => count > 0)
    .map(([domain, count]) => ({
      domain,
      count,
      color: DOMAIN_COLORS[domain as keyof typeof DOMAIN_COLORS] ?? "#94a3b8",
    }))
    .sort((a, b) => b.count - a.count)

  const ingestByDate: Record<string, number> = {}
  const decisionByDate: Record<string, number> = {}
  for (const d of docs) {
    if (!d.date) continue
    if (["insights", "rss", "url"].includes(d.category)) {
      ingestByDate[d.date] = (ingestByDate[d.date] ?? 0) + 1
    }
    if (d.category === "decisions") {
      decisionByDate[d.date] = (decisionByDate[d.date] ?? 0) + 1
    }
  }

  const allDates = new Set([...Object.keys(ingestByDate), ...Object.keys(decisionByDate)])
  const activity: ActivityPoint[] = [...allDates]
    .sort()
    .slice(-30)
    .map((date) => ({
      date,
      commits: 0,
      ingests: ingestByDate[date] ?? 0,
      decisions: decisionByDate[date] ?? 0,
    }))

  const decisionHistory: DecisionPoint[] = Object.entries(decisionByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const CAT_COLORS: Record<string, string> = {
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
  const catCounts: Record<string, number> = {}
  for (const d of docs) catCounts[d.category] = (catCounts[d.category] ?? 0) + 1
  const categoryDist: CategorySlice[] = Object.entries(catCounts)
    .map(([cat, count]) => ({ category: cat, label: CATEGORY_LABELS[cat as DocCategory] ?? cat, count, color: CAT_COLORS[cat] ?? "#94a3b8" }))
    .sort((a, b) => b.count - a.count)

  const SOURCE_COLORS = ["#818cf8", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#38bdf8", "#fb923c", "#94a3b8"]
  const srcCounts: Record<string, number> = {}
  for (const d of docs) {
    if (d.sourceName) srcCounts[d.sourceName] = (srcCounts[d.sourceName] ?? 0) + 1
  }
  const sourceDist: SourceSlice[] = Object.entries(srcCounts)
    .map(([source, count], i) => ({ source, count, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }))
    .sort((a, b) => b.count - a.count)

  const heatCounts: Record<string, number> = {}
  const heatDomain: Record<string, Partial<Record<string, number>>> = {}
  for (const d of docs) {
    if (!d.date) continue
    heatCounts[d.date] = (heatCounts[d.date] ?? 0) + 1
    const domLabel = d.tags.length ? tagToDomain(d.tags[0]) : "기타"
    if (!heatDomain[d.date]) heatDomain[d.date] = {}
    const slice = heatDomain[d.date]!
    slice[domLabel] = (slice[domLabel] ?? 0) + 1
  }
  const localYmd = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }
  const anchor = new Date()
  const heatmap: HeatmapDay[] = []
  for (let i = 97; i >= 0; i--) {
    const dt = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - i)
    const key = localYmd(dt)
    heatmap.push({
      date: key,
      count: heatCounts[key] ?? 0,
      byDomain: heatDomain[key] && Object.keys(heatDomain[key]!).length > 0 ? heatDomain[key] : undefined,
    })
  }

  return {
    ingestTrend,
    domainDist,
    categoryDist,
    sourceDist,
    batchHistory,
    activity,
    decisionHistory,
    heatmap,
    evaluatorRollup: null,
  }
}

export async function getEvaluatorRollup(): Promise<EvaluatorRollup | null> {
  const dir = join(MEMORY_ROOT, "metrics", "evaluations")
  try {
    const names = (await readdir(dir)).filter((n) => n.startsWith("eval-") && n.endsWith(".md"))
    if (names.length === 0) return null

    const rollup: EvaluatorRollup = { pass: 0, revise: 0, reject: 0, recent: [] }
    const scored: { mtime: number; id: string; date: string; verdict: string }[] = []

    for (const name of names) {
      const p = join(dir, name)
      let raw: string
      try {
        raw = await readFile(p, "utf8")
      } catch {
        continue
      }
      const { data } = matter(raw)
      const id = typeof data.id === "string" ? data.id : name.replace(/\.md$/, "")
      const date = typeof data.date === "string" ? data.date : ""
      const verdictRaw = typeof data.verdict === "string" ? data.verdict : ""
      const v = verdictRaw === "pass" || verdictRaw === "revise" || verdictRaw === "reject" ? verdictRaw : "unknown"
      if (v === "pass") rollup.pass++
      else if (v === "revise") rollup.revise++
      else if (v === "reject") rollup.reject++

      try {
        const st = await stat(p)
        scored.push({ mtime: st.mtimeMs, id, date, verdict: v })
      } catch {
        scored.push({ mtime: 0, id, date, verdict: v })
      }
    }

    scored.sort((a, b) => b.mtime - a.mtime)
    rollup.recent = scored.slice(0, 10).map(({ id, date, verdict }) => ({ id, date, verdict }))
    return rollup
  } catch {
    return null
  }
}

export interface EvaluationListItem {
  id: string
  date: string
  verdict: string
  preview: string
}

export async function listEvaluationDetails(limit = 24): Promise<EvaluationListItem[]> {
  const dir = join(MEMORY_ROOT, "metrics", "evaluations")
  const out: EvaluationListItem[] = []
  try {
    const names = (await readdir(dir)).filter((n) => n.startsWith("eval-") && n.endsWith(".md"))
    const scored: { mtime: number; path: string }[] = []
    for (const name of names) {
      const p = join(dir, name)
      try {
        const st = await stat(p)
        scored.push({ mtime: st.mtimeMs, path: p })
      } catch {
        /* skip */
      }
    }
    scored.sort((a, b) => b.mtime - a.mtime)
    const cap = Math.min(Math.max(1, limit), 80)
    for (const { path } of scored.slice(0, cap)) {
      let raw: string
      try {
        raw = await readFile(path, "utf8")
      } catch {
        continue
      }
      const { data, content } = matter(raw)
      const id = typeof data.id === "string" ? data.id : path.split(/[\\/]/).pop() ?? ""
      const date = typeof data.date === "string" ? data.date : ""
      const verdictRaw = typeof data.verdict === "string" ? data.verdict : "unknown"
      const body = content.trim()
      const preview =
        body.length > 400 ? `${body.slice(0, 400).replace(/\s+/g, " ")}…` : body.replace(/\s+/g, " ")
      out.push({ id, date, verdict: verdictRaw, preview })
    }
  } catch {
    return []
  }
  return out
}

export async function getGitLog(limit = 30): Promise<GitCommit[]> {
  try {
    const cwd = join(MEMORY_ROOT, "..")
    const raw = execFileSync(
      "git",
      ["log", `-${limit}`, "--format=%h||%ad||%s", "--date=short"],
      { cwd, encoding: "utf8", timeout: 5000 }
    )
    return raw.trim().split("\n").filter(Boolean).map((line) => {
      const [hash = "", date = "", ...rest] = line.split("||")
      return { hash, date, message: rest.join("||") }
    })
  } catch {
    return []
  }
}

export function extractDecisions(docs: DocMeta[]): DecisionEntry[] {
  return docs
    .filter((d) => d.category === "decisions")
    .map((d) => ({
      title: d.title,
      date: d.date ?? "",
      relPath: d.relPath,
      summary: d.excerpt,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getSessionLogs(): Promise<SessionLog[]> {
  const dir = join(MEMORY_ROOT, "logs", "sessions")
  const logs: SessionLog[] = []
  try {
    const entries = await readdir(dir)
    for (const name of entries) {
      if (!name.endsWith(".md") || name === "README.md") continue
      const raw = await readFile(join(dir, name), "utf8")
      const { data, content } = matter(raw)
      const id = typeof data.id === "string" ? data.id : name.replace(/\.md$/, "")
      const date = extractDate(data, name) ?? ""
      const filesChanged = typeof data.files_changed === "number" ? data.files_changed : 0
      const bullets: string[] = []
      const inSection = content.match(/## 한 일\n([\s\S]*?)(?=\n##|$)/)
      if (inSection) {
        for (const line of inSection[1].split("\n")) {
          const m = line.match(/^-\s+(.+)/)
          if (m) bullets.push(m[1].trim())
        }
      }
      logs.push({ id, date, summary: bullets.length > 0 ? bullets : ["(요약 없음)"], filesChanged })
    }
  } catch { /* no sessions dir */ }
  return logs.sort((a, b) => b.date.localeCompare(a.date))
}

export function pickSerendipity(docs: DocMeta[]): DocMeta | null {
  const pool = docs.filter(
    (d) =>
      ["insights", "rss", "url", "wiki", "curriculum"].includes(d.category) && d.excerpt.length > 20,
  )
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

export async function getStats(docs: DocMeta[]): Promise<Stats> {
  const decisions = docs.filter((d) => d.category === "decisions").length
  const ingests = docs.filter((d) =>
    ["insights", "rss", "url"].includes(d.category)
  ).length

  let batchStatus: Stats["batchStatus"] = "unknown"
  let batchLastRun: string | null = null

  try {
    const logPath = join(MEMORY_ROOT, "logs", "automation-batch.log")
    const log = await readFile(logPath, "utf8")
    const lines = log.trim().split("\n")
    for (let i = lines.length - 1; i >= 0; i--) {
      const dateMatch = lines[i].match(/^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]/)
      if (dateMatch) {
        batchLastRun = dateMatch[1]
        break
      }
    }
    const lastChunk = lines.slice(-5).join("\n")
    batchStatus = lastChunk.includes("=0") || lastChunk.includes("DONE") ? "ok" : "error"
    if (lastChunk.match(/실패=([1-9])/)) batchStatus = "error"
  } catch {
    /* no log */
  }

  return {
    totalDocs: docs.length,
    decisions,
    ingests,
    batchStatus,
    batchLastRun,
  }
}
