"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckSquare, RefreshCw } from "lucide-react"
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

type FilterKey = "all" | "active" | "doc" | "wait"

export function TodoView({ onSelectDoc }: TodoViewProps) {
  const [data, setData] = useState<TodosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>("all")

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

  /** 3군으로 나누고 각 군 내부 정렬. (빈 군 포함 — 칩 카운트에 쓴다) */
  const allGroups = useMemo(() => {
    if (!data) return []
    return GROUPS.map((g) => ({
      ...g,
      items: sortItems(data.todos.filter((t) => g.match(t.origin))),
    }))
  }, [data])

  /** 칩 카운트 — 군별 크기 + 전체 */
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: data?.total ?? 0, active: 0, doc: 0, wait: 0 }
    for (const g of allGroups) c[g.key as FilterKey] = g.items.length
    return c
  }, [allGroups, data])

  /** 실제 표시 — 필터 적용 + 빈 군 제거 */
  const groups = useMemo(
    () => allGroups.filter((g) => g.items.length > 0 && (filter === "all" || g.key === filter)),
    [allGroups, filter]
  )

  if (loading) return <p className="p-2 text-xs text-muted-foreground">할일 수집 중…</p>
  if (error) return <p className="p-2 text-xs text-rose-600 dark:text-rose-400">수집 실패: {error}</p>
  if (!data) return null

  const CHIPS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "active", label: "진행" },
    { key: "doc", label: "문서" },
    { key: "wait", label: "대기" },
  ]

  return (
    <div className="space-y-4">
      {/* 스캔 경로 부재 경고 — 오타는 "0건"이 아니라 여기서 드러나야 한다 */}
      {data.missingDirs.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <b>스캔 경로 {data.missingDirs.length}개 없음:</b> {data.missingDirs.join(" · ")} — 경로 오타면 여기서 잡힌다.
          </span>
        </div>
      )}

      {/* 필터 칩 — 읽기 전용 숫자 대신 눌러서 군을 좁힌다 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CHIPS.map((chip) => {
          const active = filter === chip.key
          return (
            <button
              key={chip.key}
              onClick={() => setFilter((f) => (f === chip.key ? "all" : chip.key))}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-foreground/30 bg-foreground/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {chip.label}
              <span className="tabular-nums font-semibold">{counts[chip.key]}</span>
            </button>
          )
        })}
        <button
          onClick={reload}
          className="ml-auto flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw size={11} /> 새로고침
        </button>
      </div>

      {data.total === 0 && (
        <p className="px-2 py-8 text-center text-xs text-muted-foreground">
          미완료 할일이 없다. 결정·노트에 &ldquo;다음 액션&rdquo; 항목을 남기면 여기 모인다.
        </p>
      )}

      {/* 필터로 좁혔는데 해당 군이 비면 — 빈 화면 대신 안내(칩은 0 도 눌린다) */}
      {data.total > 0 && filter !== "all" && groups.length === 0 && (
        <p className="px-2 py-8 text-center text-xs text-muted-foreground">
          이 필터에 해당하는 할일이 없다.{" "}
          <button onClick={() => setFilter("all")} className="underline underline-offset-2 hover:text-foreground">
            전체 보기
          </button>
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

/** 출처 배지 — goal 이면 `goal N`(+미분류 표시), doc 이면 카테고리.
 *  뷰어로 열 수 있을 때(origin.openPath)만 버튼(클릭 → 원문). 코퍼스 밖이면 클릭 불가 라벨. */
function OriginBadge({ item, onSelectDoc }: { item: TodoItem; onSelectDoc: (p: string) => void }) {
  const { origin, relPath } = item
  const isGoal = origin.kind === "goal"
  const label = isGoal
    ? origin.goalId != null
      ? `goal ${origin.goalId}`
      : "goal"
    : docBadge(relPath)
  const unknown = isGoal && origin.goalStatus === "unknown"
  const openable = !!origin.openPath

  const inner = (
    <>
      {label}
      {unknown && <span className="ml-1 text-amber-600 dark:text-amber-400">· 미분류</span>}
    </>
  )

  const base = cn(
    "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
    isGoal
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
      : "border-border text-muted-foreground"
  )

  // 열람 불가(goals/·docs/) → 죽은 버튼 대신 정보성 라벨. 클릭해도 빈 뷰로 튕기지 않는다.
  if (!openable) {
    return (
      <span className={base} title={`${relPath} (뷰어 미지원)`}>
        {inner}
      </span>
    )
  }

  return (
    <button
      onClick={() => onSelectDoc(origin.openPath!)}
      title={relPath}
      className={cn(
        base,
        "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        isGoal ? "hover:bg-emerald-100 dark:hover:bg-emerald-500/25" : "hover:bg-foreground/5 hover:text-foreground"
      )}
    >
      {inner}
    </button>
  )
}
