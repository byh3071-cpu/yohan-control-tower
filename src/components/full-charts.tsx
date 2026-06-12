"use client"

import { useEffect, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
  LineChart, Line,
} from "recharts"
import {
  TrendingUp, PieChart as PieIcon, Activity, Scale, CheckCircle, Layers,
  LayoutGrid, ClipboardCheck,
} from "lucide-react"
import type { ChartData, HeatmapDay, EvaluatorRollup } from "@/lib/types"
import { DOMAIN_AXIS_ORDER, DOMAIN_COLORS } from "@/lib/domains"
import { cn } from "@/lib/utils"

const TIP = { fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }
const TICK = { fontSize: 10 }
const AXIS = { axisLine: false, tickLine: false }
const shortDate = (v: string) => v.slice(5)

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs text-muted-foreground">
      {label} <span className="font-semibold text-foreground">{value}</span>
    </span>
  )
}

function ActivityHeatmap({ days }: { days: HeatmapDay[] }) {
  if (!days.length) return null
  const max = Math.max(1, ...days.map((d) => d.count))

  const tooltipText = (d: HeatmapDay) => {
    const lines = [`${d.date}: ${d.count}건`]
    if (d.byDomain && d.count > 0) {
      for (const dom of DOMAIN_AXIS_ORDER) {
        const n = d.byDomain[dom]
        if (n) lines.push(`${dom} ${n}`)
      }
    }
    return lines.join("\n")
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <LayoutGrid size={14} className="text-chart-3" />
        <span className="text-xs font-medium text-muted-foreground">문서 활동 히트맵</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">
        날짜가 있는 문서 · 도메인은 <strong className="text-foreground/80">첫 태그</strong> 기준 (§10.3) · 최근{" "}
        {days.length}일
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 text-[9px] text-muted-foreground">
        {DOMAIN_AXIS_ORDER.map((dom) => (
          <span key={dom} className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm shrink-0" style={{ background: DOMAIN_COLORS[dom] }} />
            {dom}
          </span>
        ))}
      </div>
      <div
        className="grid gap-1 w-full max-w-full overflow-x-auto pb-1"
        style={{ gridAutoFlow: "column", gridTemplateRows: "repeat(7, minmax(0, 1fr))", gridAutoColumns: "10px" }}
      >
        {days.map((d) => {
          const by = d.byDomain
          const hasStack = by && d.count > 0 && Object.keys(by).length > 0
          return (
            <div
              key={d.date}
              title={tooltipText(d)}
              className="rounded-[2px] min-h-[10px] w-[10px] shrink-0 border border-border/40 flex flex-col overflow-hidden"
            >
              {d.count === 0 ? (
                <div className="flex-1 min-h-[8px] bg-muted-foreground/10" />
              ) : hasStack ? (
                DOMAIN_AXIS_ORDER.map((dom) => {
                  const c = by![dom] ?? 0
                  if (c <= 0) return null
                  const pct = (c / d.count) * 100
                  return (
                    <div
                      key={`${d.date}-${dom}`}
                      className="w-full shrink-0"
                      style={{
                        height: `${pct}%`,
                        minHeight: 1,
                        backgroundColor: DOMAIN_COLORS[dom],
                      }}
                    />
                  )
                })
              ) : (
                <div
                  className="flex-1 min-h-[8px] w-full"
                  style={{
                    backgroundColor: `color-mix(in oklab, #818cf8 ${Math.round(25 + 75 * (d.count / max))}%, transparent)`,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EvaluatorPanel({ rollup }: { rollup: EvaluatorRollup | null }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<{ id: string; date: string; verdict: string; preview: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [vf, setVf] = useState<"all" | "pass" | "revise" | "reject">("all")

  useEffect(() => {
    if (!open) return
    fetch(`/api/evaluations?limit=32`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = vf === "all" ? items : items.filter((x) => x.verdict === vf)
  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) setLoading(true)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardCheck size={14} className="text-chart-5" />
        <span className="text-xs font-medium text-muted-foreground">Evaluator 요약</span>
      </div>
      {!rollup ? (
        <p className="text-xs text-muted-foreground py-8 text-center">memory/metrics/evaluations 로그 없음</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-3 text-xs">
            <Stat label="pass" value={`${rollup.pass}`} />
            <Stat label="revise" value={`${rollup.revise}`} />
            <Stat label="reject" value={`${rollup.reject}`} />
          </div>
          <ul className="space-y-1 max-h-28 overflow-y-auto text-[10px] text-muted-foreground mb-2">
            {rollup.recent.map((r) => (
              <li key={r.id} className="truncate">
                <span className="font-medium text-foreground/90">{r.verdict}</span>
                {" · "}
                {r.date} — {r.id}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={toggleOpen}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            {open ? "상세 목록 닫기" : "본문 미리보기 상세"}
          </button>
          {open && (
            <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
              <div className="flex flex-wrap gap-1">
                {(["all", "pass", "revise", "reject"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setVf(k)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] border",
                      vf === k ? "border-foreground bg-accent text-foreground" : "border-border text-muted-foreground"
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
              {loading ? (
                <p className="text-[10px] text-muted-foreground">불러오는 중…</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto text-[10px]">
                  {filtered.map((it) => (
                    <li key={it.id} className="rounded border border-border/50 bg-background/50 p-2">
                      <div className="font-medium text-foreground/90">
                        {it.verdict} · {it.date} · {it.id}
                      </div>
                      <p className="mt-1 text-muted-foreground leading-snug">{it.preview || "(본문 없음)"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface Props { data: ChartData }

export function FullCharts({ data }: Props) {
  const totalIngest = data.ingestTrend.reduce((s, d) => s + d.count, 0)
  const totalBatchOk = data.batchHistory.reduce((s, d) => s + d.ok, 0)
  const totalBatchAll = data.batchHistory.reduce((s, d) => s + d.ok + d.fail, 0)
  const batchRate = totalBatchAll > 0 ? Math.round((totalBatchOk / totalBatchAll) * 100) : 0
  const topCat = data.categoryDist[0]
  const topSrc = data.sourceDist[0]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1. 인제스트 추이 */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-chart-1" />
            <span className="text-xs font-medium text-muted-foreground">인제스트 추이</span>
          </div>
          <div className="mb-3"><Stat label="최근 30일" value={`${totalIngest}건`} /></div>
          {data.ingestTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.ingestTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={TICK} tickFormatter={shortDate} {...AXIS} />
                <YAxis tick={TICK} {...AXIS} allowDecimals={false} />
                <ReTooltip contentStyle={TIP} labelFormatter={(v) => String(v)} />
                <Area type="monotone" dataKey="count" stroke="#818cf8" fill="url(#gI)" strokeWidth={2} name="건수" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">데이터 없음</p>
          )}
        </div>

        {/* 2. 카테고리 분포 */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <PieIcon size={14} className="text-chart-2" />
            <span className="text-xs font-medium text-muted-foreground">카테고리 분포</span>
          </div>
          <div className="mb-3">{topCat && <Stat label="가장 많은 유형" value={`${topCat.label} ${topCat.count}건`} />}</div>
          {data.categoryDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={data.categoryDist} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} strokeWidth={0}>
                  {data.categoryDist.map((d) => <Cell key={d.category} fill={d.color} />)}
                </Pie>
                <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8}
                  formatter={(v: string) => <span className="text-[10px] text-foreground/80">{v}</span>} />
                <ReTooltip contentStyle={TIP} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">데이터 없음</p>
          )}
        </div>

        {/* 3. 소스 분포 */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers size={14} className="text-chart-4" />
            <span className="text-xs font-medium text-muted-foreground">소스 분포 (RSS/URL)</span>
          </div>
          <div className="mb-3">{topSrc && <Stat label="가장 활발한 소스" value={`${topSrc.source} ${topSrc.count}건`} />}</div>
          {data.sourceDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.sourceDist} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 60 }}>
                <XAxis type="number" tick={TICK} {...AXIS} allowDecimals={false} />
                <YAxis type="category" dataKey="source" tick={TICK} {...AXIS} width={60} />
                <ReTooltip contentStyle={TIP} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="건수">
                  {data.sourceDist.map((d) => <Cell key={d.source} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">소스 정보 없음</p>
          )}
        </div>

        {/* 4. 배치 성공률 */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={14} className="text-green-400" />
            <span className="text-xs font-medium text-muted-foreground">배치 성공률</span>
          </div>
          <div className="mb-3"><Stat label="성공률" value={totalBatchAll > 0 ? `${batchRate}%` : "-"} /></div>
          {data.batchHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.batchHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" tick={TICK} tickFormatter={shortDate} {...AXIS} />
                <YAxis tick={TICK} {...AXIS} allowDecimals={false} />
                <ReTooltip contentStyle={TIP} labelFormatter={(v) => String(v)} />
                <Bar dataKey="ok" stackId="a" fill="#34d399" radius={[2, 2, 0, 0]} name="성공" />
                <Bar dataKey="fail" stackId="a" fill="#f87171" radius={[2, 2, 0, 0]} name="실패" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">데이터 없음</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityHeatmap days={data.heatmap} />
        <EvaluatorPanel rollup={data.evaluatorRollup} />
      </div>

      {/* 5. 활동 타임라인 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={14} className="text-chart-1" />
          <span className="text-xs font-medium text-muted-foreground">활동 타임라인</span>
        </div>
        <div className="mb-3"><Stat label="기간" value={data.activity.length > 0 ? `${data.activity[0].date} ~ ${data.activity[data.activity.length - 1].date}` : "-"} /></div>
        {data.activity.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data.activity} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={TICK} tickFormatter={shortDate} {...AXIS} />
              <YAxis tick={TICK} {...AXIS} allowDecimals={false} />
              <ReTooltip contentStyle={TIP} labelFormatter={(v) => String(v)} />
              <Line type="monotone" dataKey="ingests" stroke="#818cf8" strokeWidth={2} dot={false} name="인제스트" />
              <Line type="monotone" dataKey="decisions" stroke="#34d399" strokeWidth={2} dot={false} name="결정" />
              <Legend iconSize={8} formatter={(v: string) => <span className="text-[10px]">{v}</span>} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">데이터 없음</p>
        )}
      </div>

      {/* 6. 결정 히스토리 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Scale size={14} className="text-chart-5" />
          <span className="text-xs font-medium text-muted-foreground">결정 히스토리</span>
        </div>
        <div className="mb-3"><Stat label="총 결정" value={`${data.decisionHistory.reduce((s, d) => s + d.count, 0)}건`} /></div>
        {data.decisionHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data.decisionHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={TICK} tickFormatter={shortDate} {...AXIS} />
              <YAxis tick={TICK} {...AXIS} allowDecimals={false} />
              <ReTooltip contentStyle={TIP} labelFormatter={(v) => String(v)} />
              <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} name="결정 수" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">데이터 없음</p>
        )}
      </div>
    </div>
  )
}
