"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckSquare, FileText, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TodoItem, TodosResponse } from "@/lib/types"

interface TodoViewProps {
  onSelectDoc: (relPath: string) => void
}

/** 출처 파일을 사람이 읽는 이름으로 — 날짜 접두어와 확장자를 걷어낸다 */
function sourceLabel(relPath: string): string {
  const file = relPath.split("/").pop() ?? relPath
  return file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}--?/, "")
}

export function TodoView({ onSelectDoc }: TodoViewProps) {
  const [data, setData] = useState<TodosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetch(`/api/todos?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: TodosResponse) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const grouped = useMemo(() => {
    if (!data) return []
    const m = new Map<string, TodoItem[]>()
    for (const t of data.todos) {
      const arr = m.get(t.relPath)
      if (arr) arr.push(t)
      else m.set(t.relPath, [t])
    }
    return [...m.entries()]
  }, [data])

  if (loading) return <p className="p-2 text-xs text-muted-foreground">할일 수집 중…</p>
  if (error) return <p className="p-2 text-xs text-rose-600 dark:text-rose-400">수집 실패: {error}</p>
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* 요약 — kimi-final 어휘: 좌측 세로바 + 큰 숫자 */}
      <div className="flex items-end gap-4 border-l-2 border-foreground/30 pl-3">
        <div>
          <p className="text-[11px] text-muted-foreground">남은 할일</p>
          <p className="text-3xl font-semibold tabular-nums leading-none">{data.total}</p>
        </div>
        <p className="pb-0.5 text-[11px] text-muted-foreground">
          {grouped.length}개 문서 · 결정·프로젝트·노트의 &ldquo;다음 액션&rdquo;만 수집
        </p>
        <button
          onClick={load}
          className="mb-0.5 ml-auto flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw size={11} /> 새로고침
        </button>
      </div>

      {data.total === 0 && (
        <p className="px-2 py-8 text-center text-xs text-muted-foreground">
          미완료 할일이 없다. 결정·노트에 &ldquo;다음 액션&rdquo; 항목을 남기면 여기 모인다.
        </p>
      )}

      {/* 출처 문서별 그룹 */}
      <div className="space-y-3">
        {grouped.map(([relPath, items]) => (
          <section key={relPath} className="rounded-lg border border-border">
            <button
              onClick={() => onSelectDoc(relPath)}
              className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText size={13} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{sourceLabel(relPath)}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{relPath}</span>
              </span>
              <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </button>

            <ul className="divide-y divide-border">
              {items.map((t) => (
                <li key={t.id} className="flex gap-2 px-3 py-2">
                  <CheckSquare size={13} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs leading-relaxed">{t.text}</span>
                    <span className={cn("mt-0.5 block text-[11px] text-muted-foreground")}>
                      {t.heading} · L{t.line}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* 근거 명시 — 어디를 훑었는지 숨기지 않는다 */}
      <p className="border-t border-border px-2 pt-2 text-[11px] leading-relaxed text-muted-foreground">
        수집 범위: {data.scanned.join(" · ")} 의 <code>- [ ]</code> 중 &ldquo;다음 액션·할일·TODO·남은·후속&rdquo; 헤딩 아래 항목만.
        규칙 문서(<code>memory/rules/**</code>)의 재사용 체크리스트와 가이드 단계는 할일이 아니라 제외한다.
      </p>
    </div>
  )
}
