"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckSquare, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TodoItem, TodoOrigin, TodosResponse } from "@/lib/types"

interface TodoViewProps {
  onSelectDoc: (relPath: string) => void
}

/** doc 출처 배지 라벨 — 첫 경로 세그먼트를 사람 말로 */
function docBadge(relPath: string): string {
  if (relPath.startsWith("memory/decisions")) return "결정로그"
  if (relPath.startsWith("memory/projects")) return "프로젝트"
  if (relPath.startsWith("docs/yohanthinking")) return "노트"
  if (relPath.startsWith("docs/vision")) return "비전"
  return relPath.split("/")[0] ?? relPath
}

/** 정렬 가중치 — 낮을수록 위 */
const PRIO_RANK: Record<string, number> = { P0: 0, P1: 1, P2: 2 }

/** 3군 고정. 출처 파일이 아니라 "지금 뭘 해야 하나"로 가른다 */
const GROUPS: { key: string; label: string; hint?: string; match: (o: TodoOrigin) => boolean }[] = [
  {
    key: "active",
    label: "지금 진행 중",
    match: (o) => o.kind === "goal" && (o.goalStatus === "ACTIVE" || o.goalStatus === "IN_PROGRESS"),
  },
  {
    key: "doc",
    label: "문서에서 나온 다음 액션",
    match: (o) => o.kind === "doc",
  },
  {
    key: "wait",
    label: "대기",
    hint: "BACKLOG · 예정 · 보류",
    match: (o) =>
      o.kind === "goal" && !(o.goalStatus === "ACTIVE" || o.goalStatus === "IN_PROGRESS"),
  },
]

function sortItems(items: TodoItem[]): TodoItem[] {
  return [...items].sort((a, b) => {
    const pa = PRIO_RANK[a.origin.priority ?? "P2"] ?? 2
    const pb = PRIO_RANK[b.origin.priority ?? "P2"] ?? 2
    return pa - pb || a.relPath.localeCompare(b.relPath) || a.line - b.line
  })
}

export function TodoView({ onSelectDoc }: TodoViewProps) {
  const [data, setData] = useState<TodosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** 실제 fetch — 효과/핸들러가 공유. 효과 본문에서 동기 setState 를 하지 않도록
   *  선(先) setLoading 은 새로고침 핸들러에만 두고, 최초 로드는 초기 state(loading=true)에 맡긴다 */
  const fetchTodos = useCallback(() => {
    fetch(`/api/todos?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: TodosResponse) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  const reload = () => {
    setLoading(true)
    setError(null)
    fetchTodos()
  }

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  /** 3군으로 나누고 각 군 내부 정렬. 빈 군은 버린다 */
  const groups = useMemo(() => {
    if (!data) return []
    return GROUPS.map((g) => ({
      ...g,
      items: sortItems(data.todos.filter((t) => g.match(t.origin))),
    })).filter((g) => g.items.length > 0)
  }, [data])

  if (loading) return <p className="p-2 text-xs text-muted-foreground">할일 수집 중…</p>
  if (error) return <p className="p-2 text-xs text-rose-600 dark:text-rose-400">수집 실패: {error}</p>
  if (!data) return null

  return (
    <div className="space-y-5">
      {/* 요약 — kimi-final 어휘: 좌측 세로바 + 큰 숫자 */}
      <div className="flex items-end gap-4 border-l-2 border-foreground/30 pl-3">
        <div>
          <p className="text-[11px] text-muted-foreground">남은 할일</p>
          <p className="text-3xl font-semibold tabular-nums leading-none">{data.total}</p>
        </div>
        <p className="pb-0.5 text-[11px] text-muted-foreground">
          진행 중 goal · 문서 &ldquo;다음 액션&rdquo; · 대기 goal 을 한 곳에
        </p>
        <button
          onClick={reload}
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

      {/* 3군 그룹 */}
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.key} className="space-y-1.5">
            <div className="flex items-baseline gap-2 px-0.5">
              <h3 className="text-xs font-semibold text-foreground/80">{g.label}</h3>
              <span className="text-[11px] tabular-nums text-muted-foreground">{g.items.length}</span>
              {g.hint && <span className="text-[10px] text-muted-foreground/70">{g.hint}</span>}
            </div>

            <ul className="overflow-hidden rounded-lg border border-border divide-y divide-border">
              {g.items.map((t) => (
                <li key={t.id} className="flex items-start gap-2 px-3 py-2">
                  <CheckSquare size={13} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 text-xs leading-relaxed">{t.text}</span>
                  <OriginBadge item={t} onSelectDoc={onSelectDoc} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* 근거 명시 — 어디를 훑었는지 숨기지 않는다 */}
      <p className="border-t border-border px-2 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        수집 범위: {data.scanned.join(" · ")}. 문서는 &ldquo;다음 액션·할일·후속&rdquo; 헤딩 아래 <code>- [ ]</code> 만,
        goal 은 <code>type: goal</code> 파일 중 <code>DONE</code> 이 아닌 것(의도 헤딩 없으면 제목 1건).
        규칙 문서(<code>memory/rules/**</code>)의 재사용 체크리스트는 제외한다.
      </p>
    </div>
  )
}

/** 출처 배지 — goal 이면 `goal N`(+미분류 표시), doc 이면 카테고리. 클릭 시 원문 열기 */
function OriginBadge({ item, onSelectDoc }: { item: TodoItem; onSelectDoc: (p: string) => void }) {
  const { origin, relPath } = item
  const isGoal = origin.kind === "goal"
  const label = isGoal
    ? origin.goalId != null
      ? `goal ${origin.goalId}`
      : "goal"
    : docBadge(relPath)
  const unknown = isGoal && origin.goalStatus === "unknown"

  return (
    <button
      onClick={() => onSelectDoc(relPath)}
      title={relPath}
      className={cn(
        "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        isGoal
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "border-border text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      )}
    >
      {label}
      {unknown && <span className="ml-1 text-amber-600 dark:text-amber-400">· 미분류</span>}
    </button>
  )
}
