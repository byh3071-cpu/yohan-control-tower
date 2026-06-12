"use client"

import {
  AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import { TrendingUp, PieChart as PieIcon } from "lucide-react"
import type { IngestTrend, CategorySlice } from "@/lib/types"

interface MiniChartsProps {
  ingestTrend: IngestTrend[]
  categoryDist: CategorySlice[]
}

export function MiniCharts({ ingestTrend, categoryDist }: MiniChartsProps) {
  const topCat = categoryDist[0]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={14} className="text-chart-1" />
          <span className="text-xs font-medium text-muted-foreground">인제스트 추이</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          최근 <span className="font-semibold text-foreground">{ingestTrend.reduce((s, d) => s + d.count, 0)}건</span>
        </p>
        {ingestTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={ingestTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradIngest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <ReTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} labelFormatter={(v) => String(v)} />
              <Area type="monotone" dataKey="count" stroke="#818cf8" fill="url(#gradIngest)" strokeWidth={2} name="건수" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">데이터 없음</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <PieIcon size={14} className="text-chart-2" />
          <span className="text-xs font-medium text-muted-foreground">카테고리 분포</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {topCat && <>최다 <span className="font-semibold text-foreground">{topCat.label} {topCat.count}건</span></>}
        </p>
        {categoryDist.length > 0 ? (
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={categoryDist} dataKey="count" nameKey="label" cx="35%" cy="50%" innerRadius={18} outerRadius={36} paddingAngle={2} strokeWidth={0}>
                {categoryDist.map((d) => <Cell key={d.category} fill={d.color} />)}
              </Pie>
              <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8}
                formatter={(value: string) => <span className="text-[10px] text-foreground/80">{value}</span>} />
              <ReTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">데이터 없음</p>
        )}
      </div>
    </div>
  )
}
