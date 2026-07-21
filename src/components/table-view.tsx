"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ArrowDown, ArrowUp, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { countByScope, docScope, isGap, SCOPE_LABEL, type DocScope } from "@/lib/doc-scope"
import type { DocMeta, DocCategory } from "@/lib/types"

interface TableViewProps {
  docs: DocMeta[]
  onSelectDoc: (relPath: string) => void
}

/** 정규화 컬럼 — 원시 status 값은 DocMeta에 보존, 표시만 5종으로 접는다 */
type StatusKey = "draft" | "decided" | "active" | "done" | "held" | "none"

const STATUS_MAP: Record<string, StatusKey> = {
  draft: "draft", proposed: "draft",
  decided: "decided", recorded: "decided", accepted: "decided", adopted: "decided",
  active: "active",
  done: "done",
  원문박제: "held", archived: "held", superseded: "held",
}

/** 라이트 bg-*-100/text-*-700/border-*-300 · 다크 bg-*-500/25/text-*-300/border-*-500/40 (디자인시스템 §1.1) */
const STATUS_STYLE: Record<StatusKey, { label: string; cls: string }> = {
  draft: { label: "초안", cls: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40" },
  decided: { label: "결정됨", cls: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/25 dark:text-violet-300 dark:border-violet-500/40" },
  active: { label: "활성", cls: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40" },
  done: { label: "완료", cls: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/25 dark:text-sky-300 dark:border-sky-500/40" },
  held: { label: "보류", cls: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40" },
  none: { label: "없음", cls: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-500/25 dark:text-slate-400 dark:border-slate-500/40" },
}

const STATUS_ORDER: StatusKey[] = ["draft", "decided", "active", "done", "held", "none"]

function normalizeStatus(raw: string | null): StatusKey {
  if (!raw) return "none"
  return STATUS_MAP[raw.trim().toLowerCase()] ?? STATUS_MAP[raw.trim()] ?? "held"
}

type SortKey = "date" | "title" | "status"

export function TableView({ docs, onSelectDoc }: TableViewProps) {
  const [q, setQ] = useState("")
  /** 기본 = 관리 대상. 수집물 443개가 관리 113개를 파묻지 않도록 (2026-07-21 실측) */
  const [scope, setScope] = useState<DocScope | "all">("managed")
  const [gapOnly, setGapOnly] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusKey | null>(null)
  const [catFilter, setCatFilter] = useState<DocCategory | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortAsc, setSortAsc] = useState(false)

  const scopeCounts = useMemo(() => countByScope(docs), [docs])

  /** 범위 안에서만 집계 — 칩 숫자와 실제 행 수가 어긋나지 않게 */
  const inScope = useMemo(
    () => (scope === "all" ? docs : docs.filter((d) => docScope(d.category) === scope)),
    [docs, scope]
  )

  const statusCounts = useMemo(() => {
    const m = new Map<StatusKey, number>()
    for (const d of inScope) {
      const k = normalizeStatus(d.status)
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [inScope])

  const categories = useMemo(() => {
    const m = new Map<DocCategory, number>()
    for (const d of inScope) m.set(d.category, (m.get(d.category) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [inScope])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = inScope.filter((d) => {
      if (gapOnly && !isGap(d)) return false
      if (statusFilter && normalizeStatus(d.status) !== statusFilter) return false
      if (catFilter && d.category !== catFilter) return false
      if (!needle) return true
      return (
        d.title.toLowerCase().includes(needle) ||
        d.relPath.toLowerCase().includes(needle) ||
        d.tags.some((t) => t.toLowerCase().includes(needle))
      )
    })
    const dir = sortAsc ? 1 : -1
    return out.sort((a, b) => {
      if (sortKey === "title") return a.title.localeCompare(b.title) * dir
      if (sortKey === "status")
        return (STATUS_ORDER.indexOf(normalizeStatus(a.status)) - STATUS_ORDER.indexOf(normalizeStatus(b.status))) * dir
      return ((a.date ?? "").localeCompare(b.date ?? "")) * dir
    })
  }, [inScope, q, gapOnly, statusFilter, catFilter, sortKey, sortAsc])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((v) => !v)
    else { setSortKey(k); setSortAsc(k === "title") }
  }

  const hasFilter = Boolean(q || statusFilter || catFilter || gapOnly || scope !== "managed")

  return (
    <div className="space-y-3">
      {/* 범위 스위치 — 관리 대상이 기본. 수집물이 관리 문서를 파묻지 않게 */}
      <div className="flex flex-wrap items-center gap-2 border-l-2 border-foreground/30 pl-2.5">
        <div className="flex rounded-md border border-border p-0.5">
          {(["managed", "collected", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              aria-pressed={scope === s}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                scope === s ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {SCOPE_LABEL[s]}{" "}
              <span className="tabular-nums">
                {s === "managed" ? scopeCounts.managed : s === "collected" ? scopeCounts.collected : scopeCounts.all}
              </span>
            </button>
          ))}
        </div>

        {scopeCounts.gaps > 0 && (
          <button
            onClick={() => { setGapOnly((v) => !v); setScope("managed") }}
            aria-pressed={gapOnly}
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40",
              !gapOnly && "opacity-60"
            )}
            title="관리 대상인데 status가 비어 있는 문서 — 채워지면 칸반이 가능해진다"
          >
            <AlertTriangle size={11} />
            구멍 <span className="tabular-nums">{scopeCounts.gaps}</span>
          </button>
        )}
      </div>

      {/* 필터 바 */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·경로·태그 검색"
            aria-label="문서 검색"
            className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {STATUS_ORDER.filter((k) => statusCounts.get(k)).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter((v) => (v === k ? null : k))}
              aria-pressed={statusFilter === k}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                STATUS_STYLE[k].cls,
                statusFilter && statusFilter !== k && "opacity-40"
              )}
            >
              {STATUS_STYLE[k].label} {statusCounts.get(k)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {categories.map(([c, n]) => (
            <button
              key={c}
              onClick={() => setCatFilter((v) => (v === c ? null : c))}
              aria-pressed={catFilter === c}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                "border-border text-muted-foreground hover:text-foreground",
                catFilter === c && "bg-foreground/10 text-foreground"
              )}
            >
              {c} {n}
            </button>
          ))}
          {hasFilter && (
            <button
              onClick={() => { setQ(""); setStatusFilter(null); setCatFilter(null); setGapOnly(false); setScope("managed") }}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={11} /> 초기화
            </button>
          )}
        </div>
      </div>

      {/* 헤더 (md 이상) */}
      <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_5.5rem_7rem_6.5rem] md:items-center md:gap-3 md:border-b md:border-border md:px-2 md:pb-1.5">
        {([["title", "제목"], ["status", "상태"]] as [SortKey, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => toggleSort(k)}
            className="flex items-center gap-1 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {label}
            {sortKey === k && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
          </button>
        ))}
        <span className="text-[11px] font-medium text-muted-foreground">분류</span>
        <button
          onClick={() => toggleSort("date")}
          className="flex items-center gap-1 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          날짜
          {sortKey === "date" && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
        </button>
      </div>

      {/* 행 */}
      <div className="divide-y divide-border">
        {rows.map((d) => {
          const s = normalizeStatus(d.status)
          return (
            <button
              key={d.relPath}
              onClick={() => onSelectDoc(d.relPath)}
              className="flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring md:grid md:grid-cols-[minmax(0,1fr)_5.5rem_7rem_6.5rem] md:items-center md:gap-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{d.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{d.relPath}</span>
                {d.tags.length > 0 && (
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {d.tags.slice(0, 6).map((t) => `#${t}`).join(" ")}
                  </span>
                )}
              </span>

              <span className="flex items-center gap-2 md:contents">
                <span className={cn("inline-block shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium", STATUS_STYLE[s].cls)}>
                  {STATUS_STYLE[s].label}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{d.category}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{d.date ?? "—"}</span>
              </span>
            </button>
          )
        })}

        {rows.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            조건에 맞는 문서가 없다. 필터를 지우면 전체가 보인다.
          </p>
        )}
      </div>

      <p className="px-2 text-[11px] text-muted-foreground">
        {rows.length}개 표시 · {SCOPE_LABEL[scope]} {scope === "managed" ? scopeCounts.managed : scope === "collected" ? scopeCounts.collected : scopeCounts.all}개 · 전체 {docs.length}개
      </p>
    </div>
  )
}
